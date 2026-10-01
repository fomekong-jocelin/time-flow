package cm.indyli.timeflow.workschedule.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import java.util.List;

public record CreateWorkScheduleCommand(
        @NotBlank String code,
        @NotBlank String name,
        String description,
        @Positive int weeklyTargetMinutes,
        @Positive int dailyTargetMinutes,
        @Positive int maxDailyMinutes,
        @Positive int maxWeeklyMinutes,
        @NotEmpty List<String> workingDays,
        boolean allowWeekendEntry,
        boolean isDefault
) {
}
