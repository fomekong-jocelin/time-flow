package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.application.TrainingService;
import cm.indyli.timeflow.training.domain.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;

/** Enable only against a dedicated ephemeral PostgreSQL test database. */
@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true", "timeflow.auth.auto-bootstrap-local-admin=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TrainingService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@EnabledIfEnvironmentVariable(named = "TIMEFLOW_TEST_DB", matches = "true")
class TrainingPostgresTest {
    @Autowired TrainingService service;
    @Autowired TrainingSessionRepository sessions;
    @Autowired TrainingParticipantRepository participants;
    @Autowired AppUserRepository users;
    @Autowired JdbcTemplate jdbc;
    AppUserEntity first, second;
    TrainingSessionEntity session;
    @BeforeEach void setup() {
        first = users.saveAndFlush(AppUserEntity.local(UUID.randomUUID() + "@example.test", "First", UserRole.COLLABORATOR));
        second = users.saveAndFlush(AppUserEntity.local(UUID.randomUUID() + "@example.test", "Second", UserRole.COLLABORATOR));
        session = sessions.saveAndFlush(TrainingSessionEntity.create(UUID.randomUUID().toString(), "Concurrent", null, null, null,
                DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.PLANNED,
                LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 1));
    }
    @AfterEach void cleanup() {
        if (session != null) { jdbc.update("DELETE FROM training_participant WHERE training_id = ?", session.getId()); sessions.deleteById(session.getId()); }
        if (first != null) users.deleteById(first.getId()); if (second != null) users.deleteById(second.getId());
    }
    TimeFlowPrincipal actor(AppUserEntity user) {
        return new TimeFlowPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), UserRole.COLLABORATOR, AuthProvider.LOCAL);
    }
    @Test void twoConcurrentRequestsForOneSeatYieldOneRegistrationAndOneConflict() throws Exception {
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            List<Future<String>> results = List.of(first, second).stream().map(user -> pool.submit(() -> {
                start.await();
                try { service.registerParticipant(session.getId(), null, actor(user)); return "registered"; }
                catch (TrainingValidationException error) { return error.getCode(); }
            })).toList();
            start.countDown();
            assertThat(List.of(results.get(0).get(15, TimeUnit.SECONDS), results.get(1).get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("registered", "training.errors.full");
        }
        assertThat(participants.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM training_participant_event e JOIN training_participant p ON p.id=e.participant_id WHERE p.training_id=?", Long.class, session.getId())).isEqualTo(1L);
    }
    @Test void cancellationAndReactivationKeepOneRowAndAppendAuditEvents() {
        service.registerParticipant(session.getId(), null, actor(first));
        UUID id = participants.findByTrainingIdAndUserId(session.getId(), first.getId()).orElseThrow().getId();
        service.unregisterParticipant(session.getId(), first.getId(), actor(first));
        service.registerParticipant(session.getId(), null, actor(first));
        var participant = participants.findByTrainingIdAndUserId(session.getId(), first.getId()).orElseThrow();
        assertThat(participant.getId()).isEqualTo(id); assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.REGISTERED);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM training_participant_event WHERE participant_id=?", Long.class, id)).isEqualTo(3L);
    }
    @Test void timestampsAndLegacyDateOnlyRowsRoundTripWithoutFabricatedTimes() {
        assertThat(sessions.findById(session.getId()).orElseThrow().getStartsAt()).isNull();
        session.schedule(OffsetDateTime.parse("2050-05-06T08:00:00Z"), OffsetDateTime.parse("2050-05-06T09:00:00Z"), "Africa/Douala");
        sessions.saveAndFlush(session);
        var loaded = sessions.findById(session.getId()).orElseThrow();
        assertThat(loaded.getStartsAt().toInstant()).isEqualTo(OffsetDateTime.parse("2050-05-06T08:00:00Z").toInstant());
        assertThat(loaded.getTimeZone()).isEqualTo("Africa/Douala");
        assertThat(loaded.getStartDate()).isEqualTo(LocalDate.of(2050, 5, 6));
    }
}
