package cm.indyli.timeflow.auth.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import cm.indyli.timeflow.auth.domain.UserRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUserEntity, UUID> {
    Optional<AppUserEntity> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByRoleAndActiveTrue(UserRole role);
    List<AppUserEntity> findAllByOrderByDisplayNameAsc();
    List<AppUserEntity> findByManagerId(UUID managerId);
    long countByWorkScheduleProfileId(UUID profileId);
}
