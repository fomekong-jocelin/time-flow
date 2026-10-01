package cm.indyli.timeflow.workschedule.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "work_schedule_profile")
public class WorkScheduleProfileEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(name = "weekly_target_minutes", nullable = false)
    private int weeklyTargetMinutes = 2100;

    @Column(name = "daily_target_minutes", nullable = false)
    private int dailyTargetMinutes = 420;

    @Column(name = "max_daily_minutes", nullable = false)
    private int maxDailyMinutes = 600;

    @Column(name = "max_weekly_minutes", nullable = false)
    private int maxWeeklyMinutes = 2880;

    @Column(name = "working_days", nullable = false, length = 100)
    private String workingDays = "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY";

    @Column(name = "allow_weekend_entry", nullable = false)
    private boolean allowWeekendEntry = false;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected WorkScheduleProfileEntity() {
    }

    public static WorkScheduleProfileEntity create(
            String code,
            String name,
            String description,
            int weeklyTargetMinutes,
            int dailyTargetMinutes,
            int maxDailyMinutes,
            int maxWeeklyMinutes,
            String workingDays,
            boolean allowWeekendEntry,
            boolean isDefault
    ) {
        var entity = new WorkScheduleProfileEntity();
        entity.id = UUID.randomUUID();
        entity.code = code;
        entity.name = name;
        entity.description = description;
        entity.weeklyTargetMinutes = weeklyTargetMinutes;
        entity.dailyTargetMinutes = dailyTargetMinutes;
        entity.maxDailyMinutes = maxDailyMinutes;
        entity.maxWeeklyMinutes = maxWeeklyMinutes;
        entity.workingDays = workingDays;
        entity.allowWeekendEntry = allowWeekendEntry;
        entity.isDefault = isDefault;
        entity.active = true;
        entity.createdAt = OffsetDateTime.now();
        entity.updatedAt = OffsetDateTime.now();
        return entity;
    }

    public void update(
            String name,
            String description,
            int weeklyTargetMinutes,
            int dailyTargetMinutes,
            int maxDailyMinutes,
            int maxWeeklyMinutes,
            String workingDays,
            boolean allowWeekendEntry
    ) {
        this.name = name;
        this.description = description;
        this.weeklyTargetMinutes = weeklyTargetMinutes;
        this.dailyTargetMinutes = dailyTargetMinutes;
        this.maxDailyMinutes = maxDailyMinutes;
        this.maxWeeklyMinutes = maxWeeklyMinutes;
        this.workingDays = workingDays;
        this.allowWeekendEntry = allowWeekendEntry;
        this.updatedAt = OffsetDateTime.now();
    }

    public void markAsDefault(boolean isDefault) {
        this.isDefault = isDefault;
        this.updatedAt = OffsetDateTime.now();
    }

    public void setActive(boolean active) {
        this.active = active;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getWeeklyTargetMinutes() {
        return weeklyTargetMinutes;
    }

    public int getDailyTargetMinutes() {
        return dailyTargetMinutes;
    }

    public int getMaxDailyMinutes() {
        return maxDailyMinutes;
    }

    public int getMaxWeeklyMinutes() {
        return maxWeeklyMinutes;
    }

    public String getWorkingDays() {
        return workingDays;
    }

    public boolean isAllowWeekendEntry() {
        return allowWeekendEntry;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public boolean isActive() {
        return active;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
