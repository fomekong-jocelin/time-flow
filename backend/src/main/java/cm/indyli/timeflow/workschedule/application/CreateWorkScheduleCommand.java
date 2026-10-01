package cm.indyli.timeflow.workschedule.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
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
        boolean isDefault,
        Integer overtimeThresholdMinutes,
        BigDecimal overtimeRateTier1,
        BigDecimal overtimeRateTier2,
        BigDecimal overtimeRateHoliday,
        String overtimeCompensationMode,
        Boolean extraTimeAllowed,
        Integer extraTimeMaxWeeklyMinutes,
        BigDecimal extraTimeRate,
        String extraTimeCompensationMode
) {
    public CreateWorkScheduleCommand(
            String code, String name, String description,
            int weeklyTargetMinutes, int dailyTargetMinutes,
            int maxDailyMinutes, int maxWeeklyMinutes,
            List<String> workingDays, boolean allowWeekendEntry, boolean isDefault
    ) {
        this(code, name, description, weeklyTargetMinutes, dailyTargetMinutes,
                maxDailyMinutes, maxWeeklyMinutes, workingDays, allowWeekendEntry, isDefault,
                weeklyTargetMinutes, BigDecimal.valueOf(1.25), BigDecimal.valueOf(1.50),
                BigDecimal.valueOf(2.00), "PAY", true, 420, BigDecimal.valueOf(1.10), "PAY");
    }
}
