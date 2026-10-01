package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record BillingOverview(
        String period,
        String periodLabel,
        LocalDate startDate,
        LocalDate endDate,
        int totalMinutes,
        int billableMinutes,
        double billableDays,
        int totalProjectsCount,
        int totalContributorsCount,
        boolean canViewFinancials,
        BigDecimal totalFinancialAmount,
        List<ProjectBillingItem> projects,
        List<UserBillingItem> users
) {}
