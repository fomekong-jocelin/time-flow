package cm.indyli.timeflow.analytics.application;

import java.time.LocalDate;
import java.util.List;

public record AnalyticsOverview(
        String period,
        String periodLabel,
        LocalDate startDate,
        LocalDate endDate,
        int totalMinutes,
        int billableMinutes,
        int internalMinutes,
        int trainingMinutes,
        int overtimeMinutes,
        double activityRate,
        int timesheetsCount,
        int contributorsCount,
        List<ProjectBreakdownItem> projectsBreakdown,
        List<ActivityBreakdownItem> activitiesBreakdown,
        List<UserBreakdownItem> usersBreakdown,
        List<MonthlyTrendItem> monthlyTrend,
        List<DailyTrendItem> dailyTrend
) {}
