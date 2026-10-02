package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class TrainingParticipantCorrectionService {
    private final TrainingSessionRepository sessions;
    private final TrainingParticipantRepository participants;
    private final AppUserRepository users;

    public TrainingParticipantCorrectionService(TrainingSessionRepository sessions,
            TrainingParticipantRepository participants, AppUserRepository users) {
        this.sessions = sessions;
        this.participants = participants;
        this.users = users;
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public void correct(UUID sessionId, UUID userId, CorrectTrainingParticipantCommand command,
                        TimeFlowPrincipal actor) {
        if (!TrainingAccess.manages(actor)) throw new AccessDeniedException("Correction administrative uniquement.");
        if (command == null) throw error("invalid", "Correction manquante.");
        // Same parent lock as registration, reactivation, attendance and trainer reassignment.
        var session = sessions.lockById(sessionId)
                .orElseThrow(() -> error("notFound", "Session introuvable."));
        var participant = participants.findByTrainingIdAndUserId(sessionId, userId)
                .orElseThrow(() -> error("notRegistered", "Inscription introuvable."));
        String reason = TrainingParticipantPolicy.validateCorrection(session.getStatus(), participant.getStatus(),
                command.expectedStatus(), command.status(), command.reason());
        if (command.status() == ParticipantStatus.REGISTERED) {
            TrainingParticipantPolicy.requireNotTrainer(session.getTrainerId(), userId);
            if (users.findById(userId).filter(AppUserEntity::isActive).isEmpty()) {
                throw error("userUnavailable", "Utilisateur indisponible.");
            }
            // ATTENDED -> REGISTERED keeps an existing place; only a reactivation takes a new place.
            if (participant.getStatus() == ParticipantStatus.CANCELLED) {
                boolean ended = session.getEndsAt() != null
                        ? !session.getEndsAt().toInstant().isAfter(Instant.now())
                        : session.getEndDate().isBefore(LocalDate.now(ZoneOffset.UTC));
                if (ended) throw error("closed", "La période d'inscription est terminée.");
                long occupied = participants.countByTrainingIdAndStatus(sessionId, ParticipantStatus.REGISTERED)
                        + participants.countByTrainingIdAndStatus(sessionId, ParticipantStatus.ATTENDED);
                if (occupied >= session.getMaxParticipants()) throw error("full", "La formation est complète.");
            }
        }
        participant.changeStatus(command.status(), actor.userId(), reason, "ADMIN_CORRECTION");
        participants.save(participant);
    }

    private TrainingValidationException error(String code, String detail) {
        return new TrainingValidationException("training.errors." + code, detail);
    }
}
