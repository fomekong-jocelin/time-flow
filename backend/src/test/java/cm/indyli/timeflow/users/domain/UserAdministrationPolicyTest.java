package cm.indyli.timeflow.users.domain;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserAdministrationPolicyTest {

    private final AppUserEntity admin = AppUserEntity.local("admin@example.com", "Admin", UserRole.ADMIN);
    private final AppUserEntity manager = AppUserEntity.sso("manager@example.com", "Manager", UserRole.MANAGER);
    private final AppUserEntity collaborator = AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR);

    @Test
    void adminCannotDeactivateOrDemoteThemselves() {
        assertThatThrownBy(() -> UserAdministrationPolicy.checkSelfChange(admin.getId(), admin, UserRole.ADMIN, false))
                .hasFieldOrPropertyWithValue("code", "self_deactivation");
        assertThatThrownBy(() -> UserAdministrationPolicy.checkSelfChange(admin.getId(), admin, UserRole.MANAGER, true))
                .hasFieldOrPropertyWithValue("code", "self_demotion");
        assertThatCode(() -> UserAdministrationPolicy.checkSelfChange(UUID.randomUUID(), admin, UserRole.MANAGER, false))
                .doesNotThrowAnyException();
    }

    @Test
    void lastActiveAdminIsKept() {
        assertThatThrownBy(() -> UserAdministrationPolicy.checkAdminRemains(admin, UserRole.COLLABORATOR, true, 1))
                .hasFieldOrPropertyWithValue("code", "last_admin");
        assertThatThrownBy(() -> UserAdministrationPolicy.checkAdminRemains(admin, UserRole.ADMIN, false, 1))
                .hasFieldOrPropertyWithValue("code", "last_admin");
        assertThatCode(() -> UserAdministrationPolicy.checkAdminRemains(admin, UserRole.COLLABORATOR, true, 2))
                .doesNotThrowAnyException();
        assertThatCode(() -> UserAdministrationPolicy.checkAdminRemains(collaborator, UserRole.MANAGER, false, 1))
                .doesNotThrowAnyException();
    }

    @Test
    void weeklyTargetMustStayWithinBounds() {
        assertThatThrownBy(() -> UserAdministrationPolicy.checkWeeklyTarget(-1)).isInstanceOf(UserAdministrationException.class);
        assertThatThrownBy(() -> UserAdministrationPolicy.checkWeeklyTarget(4201)).isInstanceOf(UserAdministrationException.class);
        assertThatCode(() -> UserAdministrationPolicy.checkWeeklyTarget(2100)).doesNotThrowAnyException();
    }

    @Test
    void managerMustBeActiveManagerCapableAndNotSelf() {
        var users = Map.of(manager.getId(), manager, collaborator.getId(), collaborator);
        assertThatCode(() -> UserAdministrationPolicy.checkManager(collaborator.getId(), manager.getId(), id -> Optional.ofNullable(users.get(id))))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> UserAdministrationPolicy.checkManager(manager.getId(), collaborator.getId(), id -> Optional.ofNullable(users.get(id))))
                .hasFieldOrPropertyWithValue("code", "invalid_manager");
        assertThatThrownBy(() -> UserAdministrationPolicy.checkManager(manager.getId(), manager.getId(), id -> Optional.ofNullable(users.get(id))))
                .hasFieldOrPropertyWithValue("code", "invalid_manager");
        assertThatThrownBy(() -> UserAdministrationPolicy.checkManager(collaborator.getId(), UUID.randomUUID(), id -> Optional.empty()))
                .hasFieldOrPropertyWithValue("code", "invalid_manager");

        manager.changeActive(false);
        assertThatThrownBy(() -> UserAdministrationPolicy.checkManager(collaborator.getId(), manager.getId(), id -> Optional.ofNullable(users.get(id))))
                .hasFieldOrPropertyWithValue("code", "invalid_manager");
    }

    @Test
    void managerAssignmentCannotCreateCycle() {
        var director = AppUserEntity.sso("director@example.com", "Director", UserRole.DIRECTION);
        manager.updateAdministrativeProfile("Manager", UserRole.MANAGER, director.getId(), 2100);
        var users = Map.of(manager.getId(), manager, director.getId(), director);

        assertThatThrownBy(() -> UserAdministrationPolicy.checkManager(director.getId(), manager.getId(), id -> Optional.ofNullable(users.get(id))))
                .hasFieldOrPropertyWithValue("code", "manager_cycle");
    }
}
