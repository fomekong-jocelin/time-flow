package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.*;
import cm.indyli.timeflow.auth.persistence.*;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class TrainingParticipantCorrectionTest {
    @Mock TrainingSessionRepository sessions;
    @Mock TrainingParticipantRepository participants;
    @Mock AppUserRepository users;
    TrainingService service;
    TrainingParticipantCorrectionService corrections;
    AppUserEntity trainer;
    TrainingSessionEntity session;
    TrainingParticipantEntity participant;
    TimeFlowPrincipal admin;

    @BeforeEach void setup() {
        service = new TrainingService(sessions, participants, users);
        corrections = new TrainingParticipantCorrectionService(sessions, participants, users);
        trainer = AppUserEntity.local("trainer@example.test", "Trainer", UserRole.TRAINER);
        session = TrainingSessionEntity.create("TRN-TEST", "Training", null, trainer.getId(), null,
                DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.PLANNED,
                LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 12);
        participant = TrainingParticipantEntity.create(session.getId(), UUID.randomUUID(), ParticipantStatus.REGISTERED);
        admin = actor(UUID.randomUUID(), UserRole.ADMIN);
    }
    TimeFlowPrincipal actor(UUID id, UserRole role) {
        return new TimeFlowPrincipal(id, "user@example.test", "User", role, AuthProvider.LOCAL);
    }
    void stubSession() { when(sessions.lockById(session.getId())).thenReturn(Optional.of(session)); }
    void stubParticipant() { when(participants.findByTrainingIdAndUserId(session.getId(), participant.getUserId())).thenReturn(Optional.of(participant)); }
    CorrectTrainingParticipantCommand command(ParticipantStatus from, ParticipantStatus to) {
        return new CorrectTrainingParticipantCommand(from, to, "  Saisie de présence erronée  ");
    }
    SaveTrainingCommand assignment(boolean consent) {
        return new SaveTrainingCommand("TRN-TEST", "Training", null, trainer.getId(), null, DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL, TrainingStatus.PLANNED, session.getStartDate(), session.getEndDate(),
                BigDecimal.ONE, 12, null, null, null, consent);
    }
    @Test void trainerCannotRegisterEvenThroughAdmin() {
        stubSession();
        assertThatThrownBy(() -> service.registerParticipant(session.getId(), trainer.getId(), admin))
                .isInstanceOf(TrainingValidationException.class).hasMessageContaining("formateur");
        verify(participants, never()).save(any());
    }
    @Test void trainerCannotReactivateOrMarkSelfAttended() {
        stubSession();
        for (var status : List.of(ParticipantStatus.REGISTERED, ParticipantStatus.ATTENDED)) {
            assertThatThrownBy(() -> service.updateParticipantStatus(session.getId(), trainer.getId(), status, admin))
                    .isInstanceOf(TrainingValidationException.class);
        }
        verify(participants, never()).save(any());
    }
    @Test void registeredTrainerCandidateRequiresExplicitConsent() {
        stubSession(); when(users.findById(trainer.getId())).thenReturn(Optional.of(trainer));
        var candidate = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.REGISTERED);
        when(participants.findByTrainingIdAndUserId(session.getId(), trainer.getId())).thenReturn(Optional.of(candidate));
        assertThatThrownBy(() -> service.updateSession(session.getId(), assignment(false), admin.userId()))
                .isInstanceOf(TrainingValidationException.class);
        assertThat(candidate.getStatus()).isEqualTo(ParticipantStatus.REGISTERED);
    }
    @Test void consentTransfersRegistrationAndRecordsActorWithoutDeleting() {
        stubSession(); when(users.findById(trainer.getId())).thenReturn(Optional.of(trainer));
        var candidate = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.REGISTERED);
        when(participants.findByTrainingIdAndUserId(session.getId(), trainer.getId())).thenReturn(Optional.of(candidate));
        when(participants.findByTrainingId(session.getId())).thenReturn(List.of(candidate));
        service.updateSession(session.getId(), assignment(true), admin.userId());
        assertThat(candidate.getStatus()).isEqualTo(ParticipantStatus.CANCELLED);
        assertThat(candidate.getEvents().getLast().getEventKind()).isEqualTo("TRAINER_ASSIGNMENT");
        assertThat(candidate.getEvents().getLast().getActorId()).isEqualTo(admin.userId());
        verify(participants, never()).deleteByTrainingIdAndUserId(any(), any());
    }
    @Test void attendanceCannotBeOverriddenByAssignmentConsent() {
        stubSession(); when(users.findById(trainer.getId())).thenReturn(Optional.of(trainer));
        var candidate = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.ATTENDED);
        when(participants.findByTrainingIdAndUserId(session.getId(), trainer.getId())).thenReturn(Optional.of(candidate));
        assertThatThrownBy(() -> service.updateSession(session.getId(), assignment(true), admin.userId()))
                .isInstanceOf(TrainingValidationException.class);
        assertThat(candidate.getStatus()).isEqualTo(ParticipantStatus.ATTENDED);
    }
    @Test void correctionForbiddenForTrainerAndCollaboratorBeforeAnyRead() {
        for (var role : List.of(UserRole.TRAINER, UserRole.COLLABORATOR, UserRole.MANAGER)) {
            assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                    command(ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED), actor(trainer.getId(), role)))
                    .isInstanceOf(AccessDeniedException.class);
        }
        verifyNoInteractions(sessions, participants, users);
    }
    @Test void adminCanWithdrawAttendanceAfterClosureAndKeepHistory() {
        session.setStatus(TrainingStatus.COMPLETED); participant.changeStatus(ParticipantStatus.ATTENDED, trainer.getId());
        var recordedAt = participant.getAttendedAt(); var id = participant.getId();
        stubSession(); stubParticipant();
        corrections.correct(session.getId(), participant.getUserId(), command(ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED), admin);
        assertThat(participant.getId()).isEqualTo(id); assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.CANCELLED);
        assertThat(participant.getEvents()).hasSize(3); assertThat(participant.getAttendedAt()).isNull();
        assertThat(participant.getEvents().get(1).getChangedAt()).isEqualTo(recordedAt);
        var event = participant.getEvents().getLast();
        assertThat(event.getReason()).isEqualTo("Saisie de présence erronée");
        assertThat(event.getActorId()).isEqualTo(admin.userId()); assertThat(event.getEventKind()).isEqualTo("ADMIN_CORRECTION");
        assertThat(session.getStatus()).isEqualTo(TrainingStatus.COMPLETED);
    }
    @Test void correctionNeedsReasonAndExpectedState() {
        stubSession(); stubParticipant();
        assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                new CorrectTrainingParticipantCommand(ParticipantStatus.REGISTERED, ParticipantStatus.CANCELLED, "    "), admin))
                .isInstanceOf(TrainingValidationException.class);
        assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                command(ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED), admin)).isInstanceOf(TrainingValidationException.class);
        assertThat(participant.getEvents()).hasSize(1); verify(participants, never()).save(any());
    }
    @Test void correctionCannotManufactureAttendanceOrReopenClosedRegistration() {
        stubSession(); stubParticipant();
        assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                command(ParticipantStatus.REGISTERED, ParticipantStatus.ATTENDED), admin)).isInstanceOf(TrainingValidationException.class);
        participant.changeStatus(ParticipantStatus.ATTENDED, trainer.getId()); session.setStatus(TrainingStatus.COMPLETED);
        assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                command(ParticipantStatus.ATTENDED, ParticipantStatus.REGISTERED), admin)).isInstanceOf(TrainingValidationException.class);
    }
    @Test void trainerCannotBeRestoredByAdministrativeCorrection() {
        participant = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.ATTENDED);
        stubSession(); stubParticipant();
        assertThatThrownBy(() -> corrections.correct(session.getId(), participant.getUserId(),
                command(ParticipantStatus.ATTENDED, ParticipantStatus.REGISTERED), admin)).isInstanceOf(TrainingValidationException.class);
    }
    @Test void legacySnapshotDoesNotInventAttendanceDate() {
        var legacy = TrainingParticipantEntity.create(session.getId(), trainer.getId(), ParticipantStatus.ATTENDED);
        assertThat(legacy.getAttendedAt()).isNull();
        participant.changeStatus(ParticipantStatus.ATTENDED, trainer.getId());
        assertThat(participant.getAttendedAt()).isNotNull();
        assertThat(participant.getRegisteredAt()).isNotNull();
    }
}
