package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class LocalAuthenticationService {

    private final AuthIdentityRepository identityRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties properties;

    public LocalAuthenticationService(AuthIdentityRepository identityRepository,
                                      PasswordEncoder passwordEncoder,
                                      AuthProperties properties) {
        this.identityRepository = identityRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Transactional(noRollbackFor = {BadCredentialsException.class, LockedException.class, DisabledException.class})
    public TimeFlowPrincipal authenticate(String email, String rawPassword) {
        var subject = normalize(email);
        var identity = identityRepository.findByProviderAndSubject(AuthProvider.LOCAL, subject)
                .orElse(null);

        if (identity == null) {
            passwordEncoder.encode(rawPassword);
            throw new BadCredentialsException("Invalid credentials");
        }

        if (!identity.isEnabled() || !identity.getUser().isActive()) {
            throw new DisabledException("Account disabled");
        }

        if (identity.isLockedAt(OffsetDateTime.now())) {
            throw new LockedException("Account temporarily locked");
        }

        if (!passwordEncoder.matches(rawPassword, identity.getPasswordHash())) {
            identity.registerFailure(properties.getMaxFailedAttempts(), properties.getLockDurationMinutes());
            identityRepository.save(identity);
            throw new BadCredentialsException("Invalid credentials");
        }

        identity.registerSuccess();
        identityRepository.save(identity);

        var user = identity.getUser();
        return new TimeFlowPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), AuthProvider.LOCAL);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
