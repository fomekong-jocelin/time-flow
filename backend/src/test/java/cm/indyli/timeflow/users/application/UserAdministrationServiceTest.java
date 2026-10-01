package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.application.DuplicateUserException;
import cm.indyli.timeflow.auth.application.LocalUserAdminService;
import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.users.domain.UserAdministrationException;
import cm.indyli.timeflow.users.infrastructure.UserAdminAuditEntity;
import cm.indyli.timeflow.users.infrastructure.UserAdminAuditRepository;
import cm.indyli.timeflow.users.infrastructure.UserSessionRevoker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class UserAdministrationServiceTest {

    private final UUID actorId = UUID.randomUUID();
    private AppUserRepository users;
    private AuthIdentityRepository identities;
    private UserAdminAuditRepository audit;
    private UserSessionRevoker revoker;
    private PasswordEncoder encoder;
    private UserAdministrationService service;

    @BeforeEach
    void setUp() {
        users = mock(AppUserRepository.class);
        identities = mock(AuthIdentityRepository.class);
        audit = mock(UserAdminAuditRepository.class);
        revoker = mock(UserSessionRevoker.class);
        encoder = mock(PasswordEncoder.class);
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(identities.findByUser_IdAndProvider(any(), any())).thenReturn(Optional.empty());
        service = new UserAdministrationService(users, identities, mock(LocalUserAdminService.class), encoder, audit, revoker);
    }

    @Test
    void invitesSsoUserWithoutIdentityAndAuditsIt() {
        var manager = AppUserEntity.sso("lead@example.com", "Lead", UserRole.MANAGER);
        when(users.findById(manager.getId())).thenReturn(Optional.of(manager));

        var user = service.inviteSso(actorId, " New.Dev@Example.com ",
                new UserProfileChange("New Dev", UserRole.COLLABORATOR, manager.getId(), 1800));

        assertThat(user.getAccountType()).isEqualTo(AccountType.SSO);
        assertThat(user.getEmail()).isEqualTo("new.dev@example.com");
        assertThat(user.getManagerId()).isEqualTo(manager.getId());
        assertThat(user.getWeeklyTargetMinutes()).isEqualTo(1800);
        verify(identities, never()).save(any());
        assertThat(capturedAudit().getAction()).isEqualTo("INVITE_SSO");
    }

    @Test
    void refusesDuplicateSsoInvitation() {
        when(users.existsByEmailIgnoreCase("dev@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.inviteSso(actorId, "dev@example.com",
                new UserProfileChange("Dev", UserRole.COLLABORATOR, null, 2100)))
                .isInstanceOf(DuplicateUserException.class);
        verifyNoInteractions(audit);
    }

    @Test
    void roleChangeRevokesSessions() {
        var user = AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        service.updateProfile(actorId, user.getId(), new UserProfileChange("Dev", UserRole.MANAGER, null, 2100));

        assertThat(user.getRole()).isEqualTo(UserRole.MANAGER);
        verify(revoker).revoke("dev@example.com", null);
        assertThat(capturedAudit().getDetails()).isEqualTo("role=COLLABORATOR->MANAGER");
    }

    @Test
    void deactivationKeepsAccountAndRevokesSsoSessions() {
        var user = AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(identities.findByUser_IdAndProvider(user.getId(), AuthProvider.ENTRA))
                .thenReturn(Optional.of(AuthIdentityEntity.entra(user, "entra-subject")));

        service.changeActive(actorId, user.getId(), false);

        assertThat(user.isActive()).isFalse();
        verify(users, never()).delete(any());
        verify(revoker).revoke("dev@example.com", "entra-subject");
    }

    @Test
    void cannotDeactivateLastAdmin() {
        var admin = AppUserEntity.local("admin@example.com", "Admin", UserRole.ADMIN);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(users.countByRoleAndActiveTrue(UserRole.ADMIN)).thenReturn(1L);

        assertThatThrownBy(() -> service.changeActive(actorId, admin.getId(), false))
                .hasFieldOrPropertyWithValue("code", "last_admin");
        assertThat(admin.isActive()).isTrue();
    }

    @Test
    void resetsLocalPasswordUnlocksAndRevokesSessions() {
        var user = AppUserEntity.local("ext@example.com", "Ext", UserRole.TRAINER);
        var identity = AuthIdentityEntity.local(user, "ext@example.com", "old-hash");
        identity.registerFailure(1, 15);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(identities.findByUser_IdAndProvider(user.getId(), AuthProvider.LOCAL)).thenReturn(Optional.of(identity));
        when(encoder.encode(anyString())).thenReturn("new-hash");

        service.resetLocalPassword(actorId, user.getId(), "a-strong-password-123");

        assertThat(identity.getPasswordHash()).isEqualTo("new-hash");
        assertThat(identity.isLockedAt(OffsetDateTime.now())).isFalse();
        verify(revoker).revoke("ext@example.com", null);
        assertThat(capturedAudit().getDetails()).isNull();
    }

    @Test
    void refusesPasswordResetForSsoAccount() {
        var user = AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.resetLocalPassword(actorId, user.getId(), "a-strong-password-123"))
                .isInstanceOf(UserAdministrationException.class)
                .hasFieldOrPropertyWithValue("code", "not_local_account");
        verifyNoInteractions(encoder);
    }

    private UserAdminAuditEntity capturedAudit() {
        var captor = ArgumentCaptor.forClass(UserAdminAuditEntity.class);
        verify(audit).save(captor.capture());
        assertThat(captor.getValue().getActorUserId()).isEqualTo(actorId);
        return captor.getValue();
    }
}
