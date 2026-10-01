package cm.indyli.timeflow.analytics.application;

public record MonthlyTrendItem(
        String month,
        String label,
        int totalMinutes,
        int billableMinutes,
        double activityRate
) {}
