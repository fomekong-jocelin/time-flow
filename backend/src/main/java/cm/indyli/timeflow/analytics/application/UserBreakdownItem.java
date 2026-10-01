package cm.indyli.timeflow.analytics.application;

import java.util.UUID;

public record UserBreakdownItem(
        UUID userId,
        String displayName,
        String email,
        String role,
        String workScheduleName,
        int totalMinutes,
        int billableMinutes,
        int overtimeMinutes,
        double activityRate
) {}
