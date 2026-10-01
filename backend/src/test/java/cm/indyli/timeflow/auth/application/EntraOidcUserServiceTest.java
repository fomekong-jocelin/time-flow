package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EntraOidcUserServiceTest {

    private static final String TENANT = "11111111-2222-3333-4444-555555555555";
    private AppUserRepository users;
    private AuthIdentityRepository identities;
    private AuthProperties properties;
    private EntraOidcUserService service;

    @BeforeEach
    void setUp() {
        users = mock(AppUserRepository.class);
        identities = mock(AuthIdentityRepository.class);
        properties = new AuthProperties();
        properties.setEntraTenantId(TENANT);
        when(identities.findByProviderAndSubject(any(), any())).thenReturn(Optional.empty());
        when(identities.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(users.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service = new EntraOidcUserService(users, identities, properties);
    }

    @Test
    void linksPreProvisionedSsoAccountFromConfiguredTenant() {
        var invited = AppUserEntity.sso("dev@example.com", "Dev", UserRole.MANAGER);
        when(users.findByEmailIgnoreCase("dev@example.com")).thenReturn(Optional.of(invited));

        var identity = service.resolveIdentity("subject-1", "dev@example.com", "Dev", TENANT.toUpperCase());

        assertThat(identity.getUser()).isSameAs(invited);
        assertThat(identity.getProvider()).isEqualTo(AuthProvider.ENTRA);
        assertThat(identity.getUser().getRole()).isEqualTo(UserRole.MANAGER);
    }

    @Test
    void neverLinksLocalAccount() {
        when(users.findByEmailIgnoreCase("ext@example.com"))
                .thenReturn(Optional.of(AppUserEntity.local("ext@example.com", "Ext", UserRole.TRAINER)));

        assertThatThrownBy(() -> service.resolveIdentity("subject-1", "ext@example.com", "Ext", TENANT))
                .isInstanceOf(OAuth2AuthenticationException.class);
        verify(identities, never()).save(any());
    }

    @Test
    void refusesLinkFromOtherOrSharedTenant() {
        when(users.findByEmailIgnoreCase("dev@example.com"))
                .thenReturn(Optional.of(AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR)));

        assertThatThrownBy(() -> service.resolveIdentity("subject-1", "dev@example.com", "Dev", "other-tenant"))
                .isInstanceOf(OAuth2AuthenticationException.class);

        properties.setEntraTenantId("common");
        assertThatThrownBy(() -> service.resolveIdentity("subject-1", "dev@example.com", "Dev", "common"))
                .isInstanceOf(OAuth2AuthenticationException.class);
        verify(identities, never()).save(any());
    }

    @Test
    void refusesSecondEntraIdentityForSameAccount() {
        var invited = AppUserEntity.sso("dev@example.com", "Dev", UserRole.COLLABORATOR);
        when(users.findByEmailIgnoreCase("dev@example.com")).thenReturn(Optional.of(invited));
        when(identities.existsByUser_IdAndProvider(invited.getId(), AuthProvider.ENTRA)).thenReturn(true);

        assertThatThrownBy(() -> service.resolveIdentity("subject-2", "dev@example.com", "Dev", TENANT))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    void autoProvisionsUnknownEmailAsSsoCollaborator() {
        when(users.findByEmailIgnoreCase("new@example.com")).thenReturn(Optional.empty());

        var identity = service.resolveIdentity("subject-3", "new@example.com", "New", TENANT);

        assertThat(identity.getUser().getAccountType()).isEqualTo(AccountType.SSO);
        assertThat(identity.getUser().getRole()).isEqualTo(UserRole.COLLABORATOR);
    }
}
