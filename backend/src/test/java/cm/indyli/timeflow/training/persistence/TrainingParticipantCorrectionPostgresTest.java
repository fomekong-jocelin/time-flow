package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.auth.domain.*;
import cm.indyli.timeflow.auth.persistence.*;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.application.*;
import cm.indyli.timeflow.training.domain.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true", "timeflow.auth.auto-bootstrap-local-admin=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TrainingService.class, TrainingParticipantCorrectionService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "TIMEFLOW_TEST_DB", matches = "true")
class TrainingParticipantCorrectionPostgresTest {
    @Autowired TrainingService service;
    @Autowired TrainingParticipantCorrectionService corrections;
    @Autowired TrainingSessionRepository sessions;
    @Autowired TrainingParticipantRepository participants;
    @Autowired AppUserRepository users;
    @Autowired JdbcTemplate jdbc;
    AppUserEntity trainer, admin;
    TrainingSessionEntity session;
    @BeforeEach void setup() {
        trainer = users.saveAndFlush(AppUserEntity.local(UUID.randomUUID() + "@example.test", "Trainer", UserRole.TRAINER));
        admin = users.saveAndFlush(AppUserEntity.local(UUID.randomUUID() + "@example.test", "Admin", UserRole.ADMIN));
        session = sessions.saveAndFlush(TrainingSessionEntity.create(UUID.randomUUID().toString(), "Training", null, null, null,
                DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.PLANNED,
                LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 1));
    }
    TimeFlowPrincipal actor(AppUserEntity user) {
        return new TimeFlowPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), AuthProvider.LOCAL);
    }
    @AfterEach void cleanup() {
        if (session != null) { jdbc.update("DELETE FROM training_participant WHERE training_id = ?", session.getId()); sessions.deleteById(session.getId()); }
        if (trainer != null) users.deleteById(trainer.getId()); if (admin != null) users.deleteById(admin.getId());
    }
    @Test void adminCorrectionPersistsReasonAndPreservesAttendanceEvent() {
        var p = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.REGISTERED);
        p.changeStatus(ParticipantStatus.ATTENDED, admin.getId()); participants.saveAndFlush(p);
        session.setStatus(TrainingStatus.COMPLETED); sessions.saveAndFlush(session);
        corrections.correct(session.getId(), trainer.getId(), new CorrectTrainingParticipantCommand(
                ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED, "Incorrect historical presence"), actor(admin));
        var reloaded = participants.findByTrainingIdAndUserId(session.getId(), trainer.getId()).orElseThrow();
        assertThat(reloaded.getId()).isEqualTo(p.getId()); assertThat(reloaded.getStatus()).isEqualTo(ParticipantStatus.CANCELLED);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM training_participant_event WHERE participant_id=?", Long.class, p.getId())).isEqualTo(3L);
        assertThat(jdbc.queryForObject("SELECT reason FROM training_participant_event WHERE participant_id=? AND event_kind='ADMIN_CORRECTION'", String.class, p.getId()))
                .isEqualTo("Incorrect historical presence");
    }
    @Test void assignmentAndConcurrentSelfEnrollmentCannotLeaveTrainerAsParticipant() throws Exception {
        service.registerParticipant(session.getId(), null, actor(trainer));
        var update = new SaveTrainingCommand(session.getReference(), session.getTitle(), null, trainer.getId(), null,
                DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.PLANNED, session.getStartDate(), session.getEndDate(),
                BigDecimal.ONE, 1, null, null, null, true);
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Future<?> assignment = pool.submit(() -> { start.await(); service.updateSession(session.getId(), update, admin.getId()); return null; });
            Future<?> registration = pool.submit(() -> {
                start.await();
                try { service.registerParticipant(session.getId(), null, actor(trainer)); }
                catch (TrainingValidationException error) { assertThat(error.getCode()).isEqualTo("training.errors.trainerParticipantConflict"); }
                return null;
            });
            start.countDown(); assignment.get(20, TimeUnit.SECONDS); registration.get(20, TimeUnit.SECONDS);
        }
        assertThat(sessions.findById(session.getId()).orElseThrow().getTrainerId()).isEqualTo(trainer.getId());
        assertThat(participants.findByTrainingIdAndUserId(session.getId(), trainer.getId()).orElseThrow().getStatus()).isEqualTo(ParticipantStatus.CANCELLED);
        assertThat(participants.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED)).isZero();
    }
}
