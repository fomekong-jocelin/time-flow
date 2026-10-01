package cm.indyli.timeflow.analytics.application;

public record ActivityBreakdownItem(
        String activityType,
        String label,
        int totalMinutes,
        double sharePercentage
) {}
