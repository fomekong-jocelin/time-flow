package cm.indyli.timeflow.users.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_admin_audit")
public class UserAdminAuditEntity {

    @Id
    private UUID id;

    @Column(name = "actor_user_id", nullable = false)
    private UUID actorUserId;

    @Column(name = "target_user_id", nullable = false)
    private UUID targetUserId;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(length = 1000)
    private String details;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    protected UserAdminAuditEntity() {
    }

    public static UserAdminAuditEntity of(UUID actorUserId, UUID targetUserId, String action, String details) {
        var entry = new UserAdminAuditEntity();
        entry.id = UUID.randomUUID();
        entry.actorUserId = actorUserId;
        entry.targetUserId = targetUserId;
        entry.action = action;
        entry.details = details;
        entry.occurredAt = OffsetDateTime.now();
        return entry;
    }

    public UUID getActorUserId() { return actorUserId; }
    public UUID getTargetUserId() { return targetUserId; }
    public String getAction() { return action; }
    public String getDetails() { return details; }
}
