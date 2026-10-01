package cm.indyli.timeflow.timesheet.persistence;

import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "timesheet_validation")
public class TimesheetValidationEntity {

    @Id
    private UUID id;

    @Column(name = "timesheet_id", nullable = false)
    private UUID timesheetId;

    @Column(name = "validator_user_id", nullable = false)
    private UUID validatorUserId;

    @Column(nullable = false, length = 30)
    private String decision;

    @Column(length = 1000)
    private String comment;

    @Column(name = "decided_at", nullable = false)
    private OffsetDateTime decidedAt;

    protected TimesheetValidationEntity() {
    }

    public static TimesheetValidationEntity record(UUID timesheetId, UUID validatorUserId, String decision, String comment) {
        var entity = new TimesheetValidationEntity();
        entity.id = UUID.randomUUID();
        entity.timesheetId = timesheetId;
        entity.validatorUserId = validatorUserId;
        entity.decision = decision;
        entity.comment = comment != null && !comment.trim().isEmpty() ? comment.trim() : null;
        entity.decidedAt = OffsetDateTime.now();
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTimesheetId() {
        return timesheetId;
    }

    public UUID getValidatorUserId() {
        return validatorUserId;
    }

    public String getDecision() {
        return decision;
    }

    public String getComment() {
        return comment;
    }

    public OffsetDateTime getDecidedAt() {
        return decidedAt;
    }
}
