package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.persistence.TrainingSessionEntity;
import org.springframework.security.access.AccessDeniedException;
import java.util.UUID;

final class TrainingAccess {
    private TrainingAccess() {}
    static boolean manages(TimeFlowPrincipal actor) {
        return actor != null && (actor.role() == UserRole.ADMIN || actor.role() == UserRole.DIRECTION);
    }
    static void requireSelfOrManager(TimeFlowPrincipal actor, UUID userId) {
        if (actor == null || (!manages(actor) && !actor.userId().equals(userId))) {
            throw new AccessDeniedException("Action hors du périmètre autorisé.");
        }
    }
    static void requireAttendance(TrainingSessionEntity session, TimeFlowPrincipal actor) {
        if (manages(actor)) return;
        if (actor == null || actor.role() != UserRole.TRAINER || !actor.userId().equals(session.getTrainerId())) {
            throw new AccessDeniedException("Seul le formateur affecté peut modifier les présences.");
        }
    }
}
