package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserSummary(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        AccountType accountType,
        boolean active,
        UUID managerId,
        String managerName,
        int weeklyTargetMinutes,
        boolean ssoLinked,
        boolean locked,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt,
        UUID workScheduleProfileId,
        String workScheduleProfileName
) {
    public UserSummary(
            UUID id,
            String email,
            String displayName,
            UserRole role,
            AccountType accountType,
            boolean active,
            UUID managerId,
            String managerName,
            int weeklyTargetMinutes,
            boolean ssoLinked,
            boolean locked,
            OffsetDateTime lastLoginAt,
            OffsetDateTime createdAt
    ) {
        this(id, email, displayName, role, accountType, active, managerId, managerName, weeklyTargetMinutes, ssoLinked, locked, lastLoginAt, createdAt, null, null);
    }
}
