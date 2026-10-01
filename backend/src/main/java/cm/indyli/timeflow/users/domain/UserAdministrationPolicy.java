package cm.indyli.timeflow.users.domain;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;

/**
 * Guard rules protecting administrative changes on TimeFlow accounts.
 */
public final class UserAdministrationPolicy {

    public static final int MAX_WEEKLY_TARGET_MINUTES = 4200;
    private static final Set<UserRole> MANAGER_ROLES = Set.of(UserRole.MANAGER, UserRole.DIRECTION, UserRole.ADMIN);

    private UserAdministrationPolicy() {
    }

    public static void checkSelfChange(UUID actorId, AppUserEntity target, UserRole newRole, boolean newActive) {
        if (!actorId.equals(target.getId())) {
            return;
        }
        if (!newActive) {
            throw new UserAdministrationException("self_deactivation", "Vous ne pouvez pas désactiver votre propre compte.");
        }
        if (target.getRole() == UserRole.ADMIN && newRole != UserRole.ADMIN) {
            throw new UserAdministrationException("self_demotion", "Vous ne pouvez pas retirer votre propre rôle administrateur.");
        }
    }

    public static void checkAdminRemains(AppUserEntity target, UserRole newRole, boolean newActive, long activeAdminCount) {
        var removesAdmin = target.isActive() && target.getRole() == UserRole.ADMIN
                && (newRole != UserRole.ADMIN || !newActive);
        if (removesAdmin && activeAdminCount <= 1) {
            throw new UserAdministrationException("last_admin", "Au moins un administrateur actif doit être conservé.");
        }
    }

    public static void checkWeeklyTarget(int weeklyTargetMinutes) {
        if (weeklyTargetMinutes < 0 || weeklyTargetMinutes > MAX_WEEKLY_TARGET_MINUTES) {
            throw new UserAdministrationException("invalid_weekly_target", "Temps hebdomadaire théorique invalide.");
        }
    }

    /**
     * Validates that {@code managerId} can manage {@code targetId}: active, manager-capable role, no cycle.
     */
    public static void checkManager(UUID targetId, UUID managerId, Function<UUID, Optional<AppUserEntity>> lookup) {
        if (managerId == null) {
            return;
        }
        if (managerId.equals(targetId)) {
            throw new UserAdministrationException("invalid_manager", "Un utilisateur ne peut pas être son propre manager.");
        }
        var manager = lookup.apply(managerId)
                .orElseThrow(() -> new UserAdministrationException("invalid_manager", "Manager introuvable."));
        if (!manager.isActive() || !MANAGER_ROLES.contains(manager.getRole())) {
            throw new UserAdministrationException("invalid_manager",
                    "Le manager doit être actif et avoir le rôle Manager, Direction ou Administrateur.");
        }
        checkNoCycle(targetId, manager, lookup);
    }

    private static void checkNoCycle(UUID targetId, AppUserEntity manager, Function<UUID, Optional<AppUserEntity>> lookup) {
        var visited = new HashSet<UUID>();
        var current = manager.getManagerId();
        while (current != null && visited.add(current)) {
            if (current.equals(targetId)) {
                throw new UserAdministrationException("manager_cycle", "Cette affectation créerait une boucle hiérarchique.");
            }
            current = lookup.apply(current).map(AppUserEntity::getManagerId).orElse(null);
        }
    }
}
