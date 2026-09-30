package cm.indyli.timeflow.auth.security;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;

import java.util.UUID;

public record TimeFlowPrincipal(
        UUID userId,
        String email,
        String displayName,
        UserRole role,
        AuthProvider provider
) {
}
