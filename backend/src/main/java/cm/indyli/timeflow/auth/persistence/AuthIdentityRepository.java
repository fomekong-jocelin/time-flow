package cm.indyli.timeflow.auth.persistence;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentityEntity, UUID> {
    Optional<AuthIdentityEntity> findByProviderAndSubject(AuthProvider provider, String subject);
    boolean existsByProviderAndSubject(AuthProvider provider, String subject);
}
