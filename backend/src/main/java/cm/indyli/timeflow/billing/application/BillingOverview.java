package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BillingOverview(
        String period, String periodLabel, LocalDate startDate, LocalDate endDate,
        int totalMinutes, int billableMinutes, double billableDays,
        int totalProjectsCount, int totalContributorsCount, boolean canViewFinancials,
        BigDecimal totalFinancialAmount, List<ProjectBillingItem> projects, List<UserBillingItem> users,
        List<MoneyTotal> moneyTotals
) {
    /** Compatibility constructor for existing callers and fixtures. */
    public BillingOverview(String period, String periodLabel, LocalDate startDate, LocalDate endDate,
            int totalMinutes, int billableMinutes, double billableDays, int totalProjectsCount,
            int totalContributorsCount, boolean canViewFinancials, BigDecimal totalFinancialAmount,
            List<ProjectBillingItem> projects, List<UserBillingItem> users) {
        this(period, periodLabel, startDate, endDate, totalMinutes, billableMinutes, billableDays,
                totalProjectsCount, totalContributorsCount, canViewFinancials, totalFinancialAmount,
                projects, users, legacyTotals(canViewFinancials, projects));
    }
    private static List<MoneyTotal> legacyTotals(boolean visible, List<ProjectBillingItem> projects) {
        if (!visible) return List.of();
        var totals = new MoneyTotals();
        for (var project : projects) totals.add(project.currency(), project.totalAmount(),
                project.totalAmount() == null ? project.billableMinutes() : 0);
        return totals.items();
    }
}
