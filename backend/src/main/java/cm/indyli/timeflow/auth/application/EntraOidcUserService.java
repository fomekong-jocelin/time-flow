package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.auth.security.SecurityAuthorities;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Locale;

@Service
public class EntraOidcUserService {

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

        var identity = identityRepository.findByProviderAndSubject(AuthProvider.ENTRA, subject)
                .orElseGet(() -> provision(subject, email, displayName));

        if (!identity.isEnabled() || !identity.getUser().isActive()) {
            throw new DisabledException("Account disabled");
        }

        identity.registerSuccess();
        identityRepository.save(identity);

        var authorities = new LinkedHashSet<>(oidcUser.getAuthorities());
        authorities.addAll(SecurityAuthorities.forRole(identity.getUser().getRole()));
        authorities.add(new SimpleGrantedAuthority("AUTH_PROVIDER_ENTRA"));

        return new DefaultOidcUser(authorities, oidcUser.getIdToken(), oidcUser.getUserInfo());
    }

    private AuthIdentityEntity provision(String subject, String email, String displayName) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("identity_link_required"),
                    "An account with this email already exists and must be linked by an administrator"
            );
        }

        var role = isBootstrapAdmin(email) ? UserRole.ADMIN : UserRole.COLLABORATOR;
        var user = userRepository.save(AppUserEntity.create(email, displayName, role));
        return identityRepository.save(AuthIdentityEntity.entra(user, subject));
    }

    private String resolveEmail(OidcUser user) {
        var email = user.getEmail();
        if (email == null || email.isBlank()) {
            email = user.getClaimAsString("preferred_username");
        }
        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException(new OAuth2Error("missing_email"), "The identity provider did not return an email");
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
