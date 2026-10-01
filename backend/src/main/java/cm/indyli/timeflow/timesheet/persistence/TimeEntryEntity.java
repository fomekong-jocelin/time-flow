package cm.indyli.timeflow.timesheet.persistence;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "time_entry")
public class TimeEntryEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timesheet_id", nullable = false)
    private TimesheetEntity timesheet;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "activity_type", nullable = false, length = 50)
    private String activityType;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false)
    private int minutes;

    @Column(nullable = false)
    private boolean billable;

    @Column(length = 1000)
    private String comment;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected TimeEntryEntity() {
    }

    public static TimeEntryEntity create(UUID projectId, String activityType, LocalDate entryDate, int minutes, boolean billable, String comment) {
        var now = OffsetDateTime.now();
        var entity = new TimeEntryEntity();
        entity.id = UUID.randomUUID();
        entity.projectId = projectId;
        entity.activityType = activityType;
        entity.entryDate = entryDate;
        entity.minutes = minutes;
        entity.billable = billable;
        entity.comment = comment;
        entity.createdAt = now;
        entity.updatedAt = now;
        return entity;
    }

    public UUID getId() {
        return id;
    }

    public TimesheetEntity getTimesheet() {
        return timesheet;
    }

    public void setTimesheet(TimesheetEntity timesheet) {
        this.timesheet = timesheet;
    }

    public UUID getProjectId() {
        return projectId;
    }

    public String getActivityType() {
        return activityType;
    }

    public LocalDate getEntryDate() {
        return entryDate;
    }

    public int getMinutes() {
        return minutes;
    }

    public boolean isBillable() {
        return billable;
    }

    public String getComment() {
        return comment;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
