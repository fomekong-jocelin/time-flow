package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.domain.UserRole;

import java.util.UUID;

public record UserProfileChange(
        String displayName,
        UserRole role,
        UUID managerId,
        int weeklyTargetMinutes,
        UUID workScheduleProfileId
) {
    public UserProfileChange(String displayName, UserRole role, UUID managerId, int weeklyTargetMinutes) {
        this(displayName, role, managerId, weeklyTargetMinutes, null);
    }
}
