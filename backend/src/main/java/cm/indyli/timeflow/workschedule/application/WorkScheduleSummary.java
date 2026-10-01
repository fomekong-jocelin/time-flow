package cm.indyli.timeflow.workschedule.application;

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
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
