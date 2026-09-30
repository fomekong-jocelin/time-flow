package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final AuthIdentityRepository identityRepository;

    public CurrentUserService(AuthIdentityRepository identityRepository) {
        this.identityRepository = identityRepository;
    }

    public TimeFlowPrincipal resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }

        if (authentication.getPrincipal() instanceof TimeFlowPrincipal principal) {
            return principal;
        }

        if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
            var identity = identityRepository.findByProviderAndSubject(AuthProvider.ENTRA, oidcUser.getSubject())
                    .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Unknown SSO identity"));
            var user = identity.getUser();
            return new TimeFlowPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), AuthProvider.ENTRA);
        }

        throw new AuthenticationCredentialsNotFoundException("Unsupported authentication principal");
    }
}
