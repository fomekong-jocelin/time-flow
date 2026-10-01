package cm.indyli.timeflow.auth.security;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TimeFlowPrincipalTest {

    @Test
    void shouldExposeEmailAsAuthenticationNameForSpringSession() {
        var principal = new TimeFlowPrincipal(
                UUID.randomUUID(),
                "admin@indyli-services.com",
                "Administrateur TimeFlow",
                UserRole.ADMIN,
                AuthProvider.LOCAL
        );

        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal,
                null,
                SecurityAuthorities.forRole(UserRole.ADMIN)
        );

        assertThat(authentication.getName()).isEqualTo("admin@indyli-services.com");
    }
}
