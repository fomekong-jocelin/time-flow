package cm.indyli.timeflow.auth.security;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;

import java.io.Serializable;
import java.security.Principal;
import java.util.UUID;

/**
 * Authenticated TimeFlow identity stored in the server-side Spring Security session.
 *
 * Implementing {@link Principal} is intentional: Spring Session derives
 * PRINCIPAL_NAME from Authentication#getName(). Returning the normalized email
 * keeps the indexed session principal stable and avoids serializing the whole
 * record representation into SPRING_SESSION.PRINCIPAL_NAME.
 */
public record TimeFlowPrincipal(
        UUID userId,
        String email,
        String displayName,
        UserRole role,
        AuthProvider provider
) implements Principal, Serializable {

    @Override
    public String getName() {
        return email;
    }
}
