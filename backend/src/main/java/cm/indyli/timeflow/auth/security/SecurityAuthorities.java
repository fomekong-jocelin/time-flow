package cm.indyli.timeflow.auth.security;

import cm.indyli.timeflow.auth.domain.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public final class SecurityAuthorities {

    private SecurityAuthorities() {
    }

    public static List<GrantedAuthority> forRole(UserRole role) {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
