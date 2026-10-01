package cm.indyli.timeflow.timesheet.domain;

import cm.indyli.timeflow.auth.domain.UserRole;

import java.util.UUID;

public final class ValidationPolicy {

    private ValidationPolicy() {
    }

    public static void ensureCanReview(TimesheetStatus status) {
        if (status != TimesheetStatus.SUBMITTED) {
            throw new TimesheetStatusException(
                    "Seules les feuilles de temps en statut SUBMITTED peuvent être examinées (statut actuel : " + status + ")."
            );
        }
    }

    public static void ensureNotSelfValidation(UUID authorId, UUID validatorId) {
        if (authorId != null && authorId.equals(validatorId)) {
            throw new TimesheetValidationException(
                    "Un utilisateur ne peut pas valider ou rejeter sa propre feuille de temps."
            );
        }
    }

    public static void ensureValidRejectionComment(String comment) {
        if (comment == null || comment.trim().length() < 3) {
            throw new TimesheetValidationException(
                    "Le motif de rejet est obligatoire (au moins 3 caractères)."
            );
        }
    }

    public static void ensureManagerScope(UUID timesheetAuthorManagerId, UUID currentUserId, UserRole currentUserRole) {
        if (currentUserRole == UserRole.ADMIN || currentUserRole == UserRole.DIRECTION) {
            return;
        }
        if (currentUserRole == UserRole.MANAGER) {
            if (timesheetAuthorManagerId == null || !timesheetAuthorManagerId.equals(currentUserId)) {
                throw new TimesheetValidationException(
                        "Vous n'êtes pas le manager responsable de ce collaborateur."
                );
            }
            return;
        }
        throw new TimesheetValidationException(
                "Le rôle " + currentUserRole + " n'est pas autorisé à valider des feuilles de temps."
        );
    }
}
