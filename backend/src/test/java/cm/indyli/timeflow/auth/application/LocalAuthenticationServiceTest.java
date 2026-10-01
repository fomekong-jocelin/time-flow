package cm.indyli.timeflow.auth.application;

import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LocalAuthenticationServiceTest {

    private AuthIdentityRepository repository;
    private LocalAuthenticationService service;
    private BCryptPasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        repository = mock(AuthIdentityRepository.class);
        encoder = new BCryptPasswordEncoder();
        var properties = new AuthProperties();
        properties.setMaxFailedAttempts(5);
        properties.setLockDurationMinutes(15);
        service = new LocalAuthenticationService(repository, encoder, properties);
    }

    @Test
    void shouldAuthenticateActiveLocalUser() {
        var user = AppUserEntity.local("trainer@example.com", "Trainer", UserRole.TRAINER);
        var identity = AuthIdentityEntity.local(user, "trainer@example.com", encoder.encode("correct-password-123"));
        when(repository.findByProviderAndSubject(AuthProvider.LOCAL, "trainer@example.com")).thenReturn(Optional.of(identity));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var principal = service.authenticate("TRAINER@example.com", "correct-password-123");

        assertThat(principal.email()).isEqualTo("trainer@example.com");
        assertThat(principal.role()).isEqualTo(UserRole.TRAINER);
        verify(repository).save(identity);
    }

    @Test
    void shouldRejectBadPasswordWithoutLeakingDetails() {
        var user = AppUserEntity.local("trainer@example.com", "Trainer", UserRole.TRAINER);
        var identity = AuthIdentityEntity.local(user, "trainer@example.com", encoder.encode("correct-password-123"));
        when(repository.findByProviderAndSubject(AuthProvider.LOCAL, "trainer@example.com")).thenReturn(Optional.of(identity));

        assertThatThrownBy(() -> service.authenticate("trainer@example.com", "wrong-password-123"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid credentials");

        assertThat(identity.getFailedAttempts()).isEqualTo(1);
        verify(repository).save(identity);
    }
}
