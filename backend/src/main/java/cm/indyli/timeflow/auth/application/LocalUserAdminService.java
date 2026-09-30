package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class LocalUserAdminService {

    private final AppUserRepository userRepository;
    private final AuthIdentityRepository identityRepository;
    private final PasswordEncoder passwordEncoder;

    public LocalUserAdminService(AppUserRepository userRepository,
                                 AuthIdentityRepository identityRepository,
                                 PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AppUserEntity create(String email, String displayName, UserRole role, String password) {
        var normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)
                || identityRepository.existsByProviderAndSubject(AuthProvider.LOCAL, normalizedEmail)) {
            throw new IllegalStateException("A user with this email already exists");
        }

        var user = userRepository.save(AppUserEntity.create(normalizedEmail, displayName, role));
        identityRepository.save(AuthIdentityEntity.local(user, normalizedEmail, passwordEncoder.encode(password)));
        return user;
    }
}
