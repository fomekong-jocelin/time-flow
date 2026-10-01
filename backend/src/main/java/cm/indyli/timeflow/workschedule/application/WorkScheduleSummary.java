package cm.indyli.timeflow.workschedule.application;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record WorkScheduleSummary(
        UUID id,
        String code,
        String name,
        String description,
        int weeklyTargetMinutes,
        int dailyTargetMinutes,
        int maxDailyMinutes,
        int maxWeeklyMinutes,
        List<String> workingDays,
        boolean allowWeekendEntry,
        boolean isDefault,
        boolean active,
        long assignedUsersCount,
        int overtimeThresholdMinutes,
        BigDecimal overtimeRateTier1,
        BigDecimal overtimeRateTier2,
        BigDecimal overtimeRateHoliday,
        String overtimeCompensationMode,
        boolean extraTimeAllowed,
        int extraTimeMaxWeeklyMinutes,
        BigDecimal extraTimeRate,
        String extraTimeCompensationMode,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public WorkScheduleSummary(
            UUID id,
            String code,
            String name,
            String description,
            int weeklyTargetMinutes,
            int dailyTargetMinutes,
            int maxDailyMinutes,
            int maxWeeklyMinutes,
            List<String> workingDays,
            boolean allowWeekendEntry,
            boolean isDefault,
            boolean active,
            long assignedUsersCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        this(
                id,
                code,
                name,
                description,
                weeklyTargetMinutes,
                dailyTargetMinutes,
                maxDailyMinutes,
                maxWeeklyMinutes,
                workingDays,
                allowWeekendEntry,
                isDefault,
                active,
                assignedUsersCount,
                weeklyTargetMinutes,
                BigDecimal.valueOf(1.25),
                BigDecimal.valueOf(1.50),
                BigDecimal.valueOf(2.00),
                "PAY",
                true,
                420,
                BigDecimal.valueOf(1.10),
                "PAY",
                createdAt,
                updatedAt
        );
    }
}
