package cm.indyli.timeflow.training.domain;

import java.util.Objects;
import java.util.UUID;

/** Session-scoped invariants shared by enrollment, assignment and administrative corrections. */
public final class TrainingParticipantPolicy {
    private TrainingParticipantPolicy() {}

    public static void requireNotTrainer(UUID trainerId, UUID participantId) {
        if (trainerId != null && trainerId.equals(participantId)) {
            throw error("trainerParticipantConflict", "Le formateur ne peut pas être participant actif de cette session.");
        }
    }

    public static boolean trainerWithdrawalRequired(ParticipantStatus current, boolean consent) {
        if (current == null || current == ParticipantStatus.CANCELLED) return false;
        if (current == ParticipantStatus.ATTENDED) {
            throw error("trainerAttendanceConflict", "Corrigez la présence avant d'affecter cette personne comme formateur.");
        }
        if (!consent) {
            throw error("trainerWithdrawalRequired", "Confirmez le retrait de l'inscription avant l'affectation comme formateur.");
        }
        return true;
    }

    public static String validateCorrection(TrainingStatus sessionStatus, ParticipantStatus current,
            ParticipantStatus expected, ParticipantStatus target, String reason) {
        if (current == null || expected == null || target == null
                || target == ParticipantStatus.ATTENDED) {
            throw error("invalid", "La correction doit retirer une inscription ou rétablir le statut inscrit.");
        }
        if (!Objects.equals(current, expected)) {
            throw error("conflict", "Le statut a changé. Actualisez avant de corriger.");
        }
        String normalized = reason == null ? "" : reason.trim();
        if (normalized.length() < 5 || normalized.length() > 500) {
            throw error("correctionReasonRequired", "Le motif doit contenir entre 5 et 500 caractères.");
        }
        if (current == target) throw error("noStatusChange", "Choisissez un statut différent.");
        // Closed sessions may be corrected by withdrawal, not silently reopened for enrollment.
        if (target == ParticipantStatus.REGISTERED
                && sessionStatus != TrainingStatus.PLANNED && sessionStatus != TrainingStatus.IN_PROGRESS) {
            throw error("closedReactivation", "Une session clôturée ne peut pas recevoir de nouvelle inscription active.");
        }
        return normalized;
    }

    private static TrainingValidationException error(String code, String detail) {
        return new TrainingValidationException("training.errors." + code, detail);
    }
}
