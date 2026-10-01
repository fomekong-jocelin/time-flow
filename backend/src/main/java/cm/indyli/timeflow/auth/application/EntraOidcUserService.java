package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.auth.security.SecurityAuthorities;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Service
public class EntraOidcUserService {

    private static final Set<String> SHARED_TENANTS = Set.of("", "common", "organizations", "consumers");

    private final OidcUserService delegate = new OidcUserService();
    private final AppUserRepository userRepository;
    private final AuthIdentityRepository identityRepository;
    private final AuthProperties properties;

    public EntraOidcUserService(AppUserRepository userRepository,
                                AuthIdentityRepository identityRepository,
                                AuthProperties properties) {
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.properties = properties;
    }

    @Transactional
    public OidcUser loadUser(OidcUserRequest request) {
        var oidcUser = delegate.loadUser(request);
        var subject = oidcUser.getSubject();
        var email = resolveEmail(oidcUser);
        var displayName = oidcUser.getFullName() == null || oidcUser.getFullName().isBlank()
                ? email
                : oidcUser.getFullName();

        var identity = resolveIdentity(subject, email, displayName, oidcUser.getClaimAsString("tid"));

        if (!identity.isEnabled() || !identity.getUser().isActive()) {
            throw new DisabledException("Account disabled");
        }

        identity.registerSuccess();
        identityRepository.save(identity);

        LinkedHashSet<GrantedAuthority> authorities = new LinkedHashSet<>(oidcUser.getAuthorities());
        authorities.addAll(SecurityAuthorities.forRole(identity.getUser().getRole()));
        authorities.add(new SimpleGrantedAuthority("AUTH_PROVIDER_ENTRA"));

        return new DefaultOidcUser(authorities, oidcUser.getIdToken(), oidcUser.getUserInfo());
    }

    AuthIdentityEntity resolveIdentity(String subject, String email, String displayName, String tenantId) {
        return identityRepository.findByProviderAndSubject(AuthProvider.ENTRA, subject)
                .orElseGet(() -> provision(subject, email, displayName, tenantId));
    }

    private AuthIdentityEntity provision(String subject, String email, String displayName, String tenantId) {
        var existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            return linkPreProvisioned(existing.get(), subject, tenantId);
        }

        var role = isBootstrapAdmin(email) ? UserRole.ADMIN : UserRole.COLLABORATOR;
        var user = userRepository.save(AppUserEntity.sso(email, displayName, role));
        return identityRepository.save(AuthIdentityEntity.entra(user, subject));
    }

    /**
     * Links the first Entra sign-in to an account an administrator created as SSO.
     * Local accounts are never linked, and the token must come from the configured tenant.
     */
    private AuthIdentityEntity linkPreProvisioned(AppUserEntity user, String subject, String tenantId) {
        if (user.getAccountType() != AccountType.SSO
                || !isConfiguredTenant(tenantId)
                || identityRepository.existsByUser_IdAndProvider(user.getId(), AuthProvider.ENTRA)) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("identity_link_required"),
                    "An account with this email already exists and must be linked by an administrator"
            );
        }
        return identityRepository.save(AuthIdentityEntity.entra(user, subject));
    }

    private boolean isConfiguredTenant(String tenantId) {
        var configured = properties.getEntraTenantId().toLowerCase(Locale.ROOT);
        return !SHARED_TENANTS.contains(configured)
                && tenantId != null
                && configured.equals(tenantId.trim().toLowerCase(Locale.ROOT));
    }

    private String resolveEmail(OidcUser user) {
        var email = user.getEmail();
        if (email == null || email.isBlank()) {
            email = user.getClaimAsString("preferred_username");
        }
        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("missing_email"),
                    "The identity provider did not return an email"
            );
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBootstrapAdmin(String email) {
        var normalized = email.toLowerCase(Locale.ROOT);
        return properties.getBootstrapAdminEmails().stream()
                .map(value -> value.toLowerCase(Locale.ROOT).trim())
                .anyMatch(normalized::equals);
    }
}
