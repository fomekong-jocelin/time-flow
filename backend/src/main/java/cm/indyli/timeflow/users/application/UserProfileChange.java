package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.domain.UserRole;

import java.math.BigDecimal;
import java.util.UUID;

public record UserProfileChange(
        String displayName,
        UserRole role,
        UUID managerId,
        int weeklyTargetMinutes,
        UUID workScheduleProfileId,
        BigDecimal dailyRate
) {
    public UserProfileChange(String displayName, UserRole role, UUID managerId, int weeklyTargetMinutes, UUID workScheduleProfileId) {
        this(displayName, role, managerId, weeklyTargetMinutes, workScheduleProfileId, null);
    }

    public UserProfileChange(String displayName, UserRole role, UUID managerId, int weeklyTargetMinutes) {
        this(displayName, role, managerId, weeklyTargetMinutes, null, null);
    }
}
