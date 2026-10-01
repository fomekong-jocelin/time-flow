package cm.indyli.timeflow.workschedule.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
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

    @Column(name = "overtime_threshold_minutes", nullable = false)
    private int overtimeThresholdMinutes = 2100;

    @Column(name = "overtime_rate_tier1", nullable = false, precision = 4, scale = 2)
    private BigDecimal overtimeRateTier1 = BigDecimal.valueOf(1.25);

    @Column(name = "overtime_rate_tier2", nullable = false, precision = 4, scale = 2)
    private BigDecimal overtimeRateTier2 = BigDecimal.valueOf(1.50);

    @Column(name = "overtime_rate_holiday", nullable = false, precision = 4, scale = 2)
    private BigDecimal overtimeRateHoliday = BigDecimal.valueOf(2.00);

    @Column(name = "overtime_compensation_mode", nullable = false, length = 20)
    private String overtimeCompensationMode = "PAY";

    @Column(name = "extra_time_allowed", nullable = false)
    private boolean extraTimeAllowed = true;

    @Column(name = "extra_time_max_weekly_minutes", nullable = false)
    private int extraTimeMaxWeeklyMinutes = 420;

    @Column(name = "extra_time_rate", nullable = false, precision = 4, scale = 2)
    private BigDecimal extraTimeRate = BigDecimal.valueOf(1.10);

    @Column(name = "extra_time_compensation_mode", nullable = false, length = 20)
    private String extraTimeCompensationMode = "PAY";

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
        return create(
                code, name, description, weeklyTargetMinutes, dailyTargetMinutes,
                maxDailyMinutes, maxWeeklyMinutes, workingDays, allowWeekendEntry, isDefault,
                weeklyTargetMinutes, BigDecimal.valueOf(1.25), BigDecimal.valueOf(1.50),
                BigDecimal.valueOf(2.00), "PAY", true, 420, BigDecimal.valueOf(1.10), "PAY"
        );
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
            boolean isDefault,
            int overtimeThresholdMinutes,
            BigDecimal overtimeRateTier1,
            BigDecimal overtimeRateTier2,
            BigDecimal overtimeRateHoliday,
            String overtimeCompensationMode,
            boolean extraTimeAllowed,
            int extraTimeMaxWeeklyMinutes,
            BigDecimal extraTimeRate,
            String extraTimeCompensationMode
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
        entity.overtimeThresholdMinutes = overtimeThresholdMinutes > 0 ? overtimeThresholdMinutes : weeklyTargetMinutes;
        entity.overtimeRateTier1 = overtimeRateTier1 != null ? overtimeRateTier1 : BigDecimal.valueOf(1.25);
        entity.overtimeRateTier2 = overtimeRateTier2 != null ? overtimeRateTier2 : BigDecimal.valueOf(1.50);
        entity.overtimeRateHoliday = overtimeRateHoliday != null ? overtimeRateHoliday : BigDecimal.valueOf(2.00);
        entity.overtimeCompensationMode = overtimeCompensationMode != null ? overtimeCompensationMode : "PAY";
        entity.extraTimeAllowed = extraTimeAllowed;
        entity.extraTimeMaxWeeklyMinutes = Math.max(0, extraTimeMaxWeeklyMinutes);
        entity.extraTimeRate = extraTimeRate != null ? extraTimeRate : BigDecimal.valueOf(1.10);
        entity.extraTimeCompensationMode = extraTimeCompensationMode != null ? extraTimeCompensationMode : "PAY";
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
            boolean allowWeekendEntry,
            int overtimeThresholdMinutes,
            BigDecimal overtimeRateTier1,
            BigDecimal overtimeRateTier2,
            BigDecimal overtimeRateHoliday,
            String overtimeCompensationMode,
            boolean extraTimeAllowed,
            int extraTimeMaxWeeklyMinutes,
            BigDecimal extraTimeRate,
            String extraTimeCompensationMode
    ) {
        this.name = name;
        this.description = description;
        this.weeklyTargetMinutes = weeklyTargetMinutes;
        this.dailyTargetMinutes = dailyTargetMinutes;
        this.maxDailyMinutes = maxDailyMinutes;
        this.maxWeeklyMinutes = maxWeeklyMinutes;
        this.workingDays = workingDays;
        this.allowWeekendEntry = allowWeekendEntry;
        this.overtimeThresholdMinutes = overtimeThresholdMinutes > 0 ? overtimeThresholdMinutes : weeklyTargetMinutes;
        this.overtimeRateTier1 = overtimeRateTier1 != null ? overtimeRateTier1 : BigDecimal.valueOf(1.25);
        this.overtimeRateTier2 = overtimeRateTier2 != null ? overtimeRateTier2 : BigDecimal.valueOf(1.50);
        this.overtimeRateHoliday = overtimeRateHoliday != null ? overtimeRateHoliday : BigDecimal.valueOf(2.00);
        this.overtimeCompensationMode = overtimeCompensationMode != null ? overtimeCompensationMode : "PAY";
        this.extraTimeAllowed = extraTimeAllowed;
        this.extraTimeMaxWeeklyMinutes = Math.max(0, extraTimeMaxWeeklyMinutes);
        this.extraTimeRate = extraTimeRate != null ? extraTimeRate : BigDecimal.valueOf(1.10);
        this.extraTimeCompensationMode = extraTimeCompensationMode != null ? extraTimeCompensationMode : "PAY";
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

    public int getOvertimeThresholdMinutes() {
        return overtimeThresholdMinutes;
    }

    public BigDecimal getOvertimeRateTier1() {
        return overtimeRateTier1;
    }

    public BigDecimal getOvertimeRateTier2() {
        return overtimeRateTier2;
    }

    public BigDecimal getOvertimeRateHoliday() {
        return overtimeRateHoliday;
    }

    public String getOvertimeCompensationMode() {
        return overtimeCompensationMode;
    }

    public boolean isExtraTimeAllowed() {
        return extraTimeAllowed;
    }

    public int getExtraTimeMaxWeeklyMinutes() {
        return extraTimeMaxWeeklyMinutes;
    }

    public BigDecimal getExtraTimeRate() {
        return extraTimeRate;
    }

    public String getExtraTimeCompensationMode() {
        return extraTimeCompensationMode;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
