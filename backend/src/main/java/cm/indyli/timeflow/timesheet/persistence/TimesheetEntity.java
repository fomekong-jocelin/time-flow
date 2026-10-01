package cm.indyli.timeflow.timesheet.persistence;

import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "timesheet", uniqueConstraints = {
        @UniqueConstraint(name = "uq_timesheet_user_week", columnNames = {"user_id", "week_start"})
})
public class TimesheetEntity {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TimesheetStatus status;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "validated_at")
    private OffsetDateTime validatedAt;

    @Column(name = "locked_at")
    private OffsetDateTime lockedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "timesheet", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TimeEntryEntity> entries = new ArrayList<>();

    protected TimesheetEntity() {
    }

    public static TimesheetEntity draft(UUID userId, LocalDate weekStart) {
        var now = OffsetDateTime.now();
        var timesheet = new TimesheetEntity();
        timesheet.id = UUID.randomUUID();
        timesheet.userId = userId;
        timesheet.weekStart = weekStart;
        timesheet.status = TimesheetStatus.DRAFT;
        timesheet.createdAt = now;
        timesheet.updatedAt = now;
        return timesheet;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public LocalDate getWeekStart() {
        return weekStart;
    }

    public TimesheetStatus getStatus() {
        return status;
    }

    public OffsetDateTime getSubmittedAt() {
        return submittedAt;
    }

    public OffsetDateTime getValidatedAt() {
        return validatedAt;
    }

    public OffsetDateTime getLockedAt() {
        return lockedAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<TimeEntryEntity> getEntries() {
        return entries;
    }

    public void replaceEntries(List<TimeEntryEntity> newEntries) {
        this.entries.clear();
        for (var entry : newEntries) {
            entry.setTimesheet(this);
            this.entries.add(entry);
        }
        this.updatedAt = OffsetDateTime.now();
        if (this.status == TimesheetStatus.REJECTED) {
            this.status = TimesheetStatus.DRAFT;
        }
    }

    public void submit() {
        this.status = TimesheetStatus.SUBMITTED;
        this.submittedAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }
}
