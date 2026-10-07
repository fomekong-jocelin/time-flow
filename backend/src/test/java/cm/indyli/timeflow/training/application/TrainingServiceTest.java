package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TrainingServiceTest {
    @Mock TrainingSessionRepository sessionRepository;
    @Mock TrainingParticipantRepository participantRepository;
    @Mock AppUserRepository userRepository;
    @InjectMocks TrainingService service;
    AppUserEntity trainer, user;
    TrainingSessionEntity session;
    TimeFlowPrincipal learner, instructor;
    @BeforeEach void setup() {
        trainer = AppUserEntity.local("trainer@example.test", "Trainer", UserRole.TRAINER);
        user = AppUserEntity.local("learner@example.test", "Learner", UserRole.COLLABORATOR);
        learner = actor(user.getId(), UserRole.COLLABORATOR); instructor = actor(trainer.getId(), UserRole.TRAINER);
        session = TrainingSessionEntity.create("T-1", "Training", null, trainer.getId(), "Room", DeliveryMode.ON_SITE,
                TrainingCategory.INTERNAL, TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.valueOf(7), 1);
    }
    TimeFlowPrincipal actor(UUID id, UserRole role) { return new TimeFlowPrincipal(id, "actor@example.test", "Actor", role, AuthProvider.LOCAL); }
    SaveTrainingCommand command(int capacity) {
        return new SaveTrainingCommand("T-1", "Training", null, null, "Room", DeliveryMode.ON_SITE, TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.valueOf(7), capacity);
    }
    void lock() { when(sessionRepository.lockById(session.getId())).thenReturn(Optional.of(session)); }
    void active() { when(userRepository.findById(user.getId())).thenReturn(Optional.of(user)); }
    TrainingParticipantEntity existing(ParticipantStatus status) {
        lock(); var participant = TrainingParticipantEntity.create(session.getId(), user.getId(), status);
        when(participantRepository.findByTrainingIdAndUserId(session.getId(), user.getId())).thenReturn(Optional.of(participant));
        return participant;
    }
    void rejects(String code, Runnable operation) {
        var error = assertThrows(TrainingValidationException.class, operation::run);
        assertThat(error.getCode()).isEqualTo("training.errors." + code);
    }
    @Test void createSessionSuccess() {
        var c = new SaveTrainingCommand("T-1", "Training", null, trainer.getId(), "Room", DeliveryMode.ON_SITE,
                TrainingCategory.INTERNAL, TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.valueOf(7), 10);
        when(userRepository.findById(trainer.getId())).thenReturn(Optional.of(trainer));
        when(userRepository.findAllById(any())).thenReturn(List.of(trainer));
        var result = service.createSession(c, trainer.getId());
        assertThat(result.reference()).isEqualTo("T-1"); assertThat(result.trainerDisplayName()).isEqualTo("Trainer");
        verify(sessionRepository).save(any(TrainingSessionEntity.class));
    }
    @Test void createSessionDuplicateReferenceThrows() {
        when(sessionRepository.existsByReferenceIgnoreCase("T-1")).thenReturn(true);
        rejects("duplicateReference", () -> service.createSession(command(10), user.getId()));
        verify(sessionRepository, never()).save(any());
    }
    @Test void createSessionInvalidDatesThrows() {
        var c = new SaveTrainingCommand("T-1", "Training", null, null, null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED, LocalDate.of(2050, 5, 7), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 10);
        rejects("datesInvalid", () -> service.createSession(c, user.getId()));
    }
    @Test void legacyOneDaySessionCanBeEditedWithoutInventingTimes() {
        lock(); var result = service.updateSession(session.getId(), command(1), user.getId());
        assertThat(result.startDate()).isEqualTo(result.endDate()); assertThat(result.startsAt()).isNull();
    }
    @Test void timedSessionPreservesInstantAndZone() {
        var c = new SaveTrainingCommand("T-1", "Timed", null, null, null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 10,
                OffsetDateTime.parse("2050-05-06T08:00:00Z"), OffsetDateTime.parse("2050-05-06T09:00:00Z"), "Africa/Douala");
        var result = service.createSession(c, user.getId());
        assertThat(result.startsAt()).isEqualTo(c.startsAt()); assertThat(result.timeZone()).isEqualTo("Africa/Douala");
    }
    @Test void incompleteTimedContractIsRejected() {
        var c = new SaveTrainingCommand("T-1", "Timed", null, null, null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 10,
                OffsetDateTime.parse("2050-05-06T08:00:00Z"), null, "Africa/Douala");
        rejects("datesInvalid", () -> service.createSession(c, user.getId()));
    }
    @Test void collaboratorCannotBeAssignedAsTrainer() {
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        var c = new SaveTrainingCommand("T-1", "Training", null, user.getId(), null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 10);
        rejects("trainerInvalid", () -> service.createSession(c, user.getId()));
    }
    @Test void invalidCapacityIsRejectedByServiceToo() {
        for (int capacity : new int[]{0, 501}) rejects("invalid", () -> service.createSession(command(capacity), user.getId()));
    }
    @Test void registerParticipantSuccess() {
        lock(); active(); service.registerParticipant(session.getId(), null, learner);
        verify(participantRepository).save(argThat(p -> p.getUserId().equals(user.getId()) && p.getStatus() == ParticipantStatus.REGISTERED));
    }
    @Test void registerParticipantAlreadyRegisteredIsIdempotent() {
        var participant = existing(ParticipantStatus.REGISTERED); active();
        service.registerParticipant(session.getId(), user.getId(), learner);
        assertThat(participant.getEvents()).hasSize(1); verify(participantRepository, never()).save(any());
    }
    @Test void registerParticipantCapacityReachedThrows() {
        lock(); active(); when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED)).thenReturn(1L);
        rejects("full", () -> service.registerParticipant(session.getId(), null, learner)); verify(participantRepository, never()).save(any());
    }
    @Test void attendedParticipantsStillOccupySeats() {
        lock(); active(); when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.ATTENDED)).thenReturn(1L);
        rejects("full", () -> service.registerParticipant(session.getId(), null, learner)); verify(participantRepository, never()).save(any());
    }
    @Test void cancelledRegistrationReactivatesWithoutLosingIdentityOrHistory() {
        var participant = existing(ParticipantStatus.CANCELLED); active();
        var id = participant.getId(); var timestamp = participant.getRegisteredAt();
        service.registerParticipant(session.getId(), null, learner);
        assertThat(participant.getId()).isEqualTo(id); assertThat(participant.getRegisteredAt()).isEqualTo(timestamp);
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.REGISTERED);
        assertThat(participant.getEvents()).hasSize(2); assertThat(participant.getEvents().getLast().getActorId()).isEqualTo(user.getId());
    }
    @Test void reactivationAtCapacityDoesNotChangeCancelledRecord() {
        var participant = existing(ParticipantStatus.CANCELLED); active();
        when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.ATTENDED)).thenReturn(1L);
        rejects("full", () -> service.registerParticipant(session.getId(), null, learner));
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.CANCELLED); verify(participantRepository, never()).save(any());
    }
    @Test void unregisterParticipantPreservesRegistrationAndAddsEvent() {
        var participant = existing(ParticipantStatus.REGISTERED);
        service.unregisterParticipant(session.getId(), user.getId(), learner);
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.CANCELLED); assertThat(participant.getEvents()).hasSize(2);
        verify(participantRepository, never()).deleteByTrainingIdAndUserId(any(), any());
    }
    @Test void cannotUnregisterAnAttendedParticipant() {
        var participant = existing(ParticipantStatus.ATTENDED);
        rejects("historyProtected", () -> service.unregisterParticipant(session.getId(), user.getId(), learner));
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.ATTENDED);
    }
    @Test void cannotUnregisterFromACompletedSession() {
        lock(); session.setStatus(TrainingStatus.COMPLETED);
        rejects("closed", () -> service.unregisterParticipant(session.getId(), user.getId(), learner)); verifyNoInteractions(participantRepository);
    }
    @Test void collaboratorCannotRegisterSomeoneElse() {
        assertThrows(AccessDeniedException.class, () -> service.registerParticipant(session.getId(), UUID.randomUUID(), learner));
        verifyNoInteractions(sessionRepository, participantRepository, userRepository);
    }
    @Test void foreignTrainerCannotChangeAttendance() {
        lock(); session.setStatus(TrainingStatus.IN_PROGRESS);
        assertThrows(AccessDeniedException.class, () -> service.updateParticipantStatus(session.getId(), user.getId(),
                ParticipantStatus.ATTENDED, actor(UUID.randomUUID(), UserRole.TRAINER))); verifyNoInteractions(participantRepository);
    }
    @Test void assignedTrainerCanRecordAttendance() {
        var participant = existing(ParticipantStatus.REGISTERED); session.setStatus(TrainingStatus.IN_PROGRESS);
        service.updateParticipantStatus(session.getId(), user.getId(), ParticipantStatus.ATTENDED, instructor);
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.ATTENDED);
        assertThat(participant.getEvents().getLast().getActorId()).isEqualTo(trainer.getId());
    }
    @Test void directionCanRecordAttendanceWithoutBeingTheTrainer() {
        var participant = existing(ParticipantStatus.REGISTERED); session.setStatus(TrainingStatus.IN_PROGRESS);
        service.updateParticipantStatus(session.getId(), user.getId(), ParticipantStatus.ATTENDED, actor(UUID.randomUUID(), UserRole.DIRECTION));
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.ATTENDED);
    }
    @Test void attendanceCannotBeRecordedBeforeSessionStarts() {
        var participant = existing(ParticipantStatus.REGISTERED);
        rejects("attendanceNotOpen", () -> service.updateParticipantStatus(session.getId(), user.getId(), ParticipantStatus.ATTENDED, instructor));
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.REGISTERED);
    }
    @Test void loweringCapacityBelowOccupancyIsRejected() {
        lock(); when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.ATTENDED)).thenReturn(2L);
        rejects("capacityBelowOccupancy", () -> service.updateSession(session.getId(), command(1), user.getId()));
    }
    @Test void deletingSessionWithAnyParticipationHistoryIsRejected() {
        lock(); when(participantRepository.existsByTrainingId(session.getId())).thenReturn(true);
        rejects("historyProtected", () -> service.deleteSession(session.getId())); verify(sessionRepository, never()).delete(any(cm.indyli.timeflow.training.persistence.TrainingSessionEntity.class));
    }
    @Test void getKpisCalculation() {
        when(sessionRepository.count()).thenReturn(2L); when(sessionRepository.countByStatus(TrainingStatus.PLANNED)).thenReturn(1L);
        when(sessionRepository.countByStatus(TrainingStatus.COMPLETED)).thenReturn(1L);
        when(sessionRepository.sumPlannedHours(TrainingStatus.CANCELLED)).thenReturn(BigDecimal.valueOf(21));
        when(participantRepository.countActiveRegistrations(ParticipantStatus.CANCELLED, TrainingStatus.CANCELLED)).thenReturn(8L);
        var kpi = service.getKpis(); assertThat(kpi.totalSessions()).isEqualTo(2); assertThat(kpi.totalPlannedHours()).isEqualByComparingTo("21");
        assertThat(kpi.totalRegistrations()).isEqualTo(8);
    }
    @Test @SuppressWarnings("unchecked") void paginatedListCountsAttendanceInBulkAndMatchesDetail() {
        when(sessionRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(session)));
        var occupancy = mock(TrainingParticipantRepository.Occupancy.class);
        when(occupancy.getTrainingId()).thenReturn(session.getId()); when(occupancy.getTotal()).thenReturn(1L);
        when(participantRepository.countOccupiedByTrainingIds(any(), eq(ParticipantStatus.CANCELLED))).thenReturn(List.of(occupancy));
        var participant = TrainingParticipantEntity.create(session.getId(), user.getId(), ParticipantStatus.ATTENDED);
        when(participantRepository.findByUserIdAndTrainingIdIn(eq(user.getId()), any())).thenReturn(List.of(participant));
        var result = service.listPage(null, null, null, null, null, false, user.getId(), 0, 24);
        assertThat(result.items().getFirst().registeredCount()).isEqualTo(1); assertThat(result.items().getFirst().isCurrentUserRegistered()).isTrue();
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(participantRepository.findByTrainingId(session.getId())).thenReturn(List.of(participant));
        assertThat(service.getSession(session.getId(), user.getId()).registeredCount()).isEqualTo(1);
        verify(userRepository, never()).findAll(); verify(participantRepository, never()).countByTrainingIdAndStatus(any(), any());
    }
    @Test void getAvailableUsers() {
        var inactive = mock(AppUserEntity.class);
        when(userRepository.findAllByOrderByDisplayNameAsc()).thenReturn(List.of(trainer, user, inactive));
        var result = service.getAvailableUsers(); assertThat(result).hasSize(2); assertThat(result.getFirst().role()).isEqualTo(UserRole.TRAINER);
    }
}
