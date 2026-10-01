package cm.indyli.timeflow.analytics.application;

import java.util.UUID;

public record ProjectBreakdownItem(
        UUID projectId,
        String projectName,
        String projectReference,
        int totalMinutes,
        int billableMinutes,
        double sharePercentage
) {}
