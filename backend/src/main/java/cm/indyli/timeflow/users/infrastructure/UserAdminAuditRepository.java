package cm.indyli.timeflow.users.infrastructure;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserAdminAuditRepository extends JpaRepository<UserAdminAuditEntity, UUID> {
}
