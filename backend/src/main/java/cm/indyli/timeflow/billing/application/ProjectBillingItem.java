package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.util.UUID;

public record ProjectBillingItem(
        UUID projectId,
        String projectName,
        String projectReference,
        String clientOrganization,
        int totalMinutes,
        int billableMinutes,
        double billableDays,
        BigDecimal dailyRate,
        BigDecimal totalAmount,
        int contributorsCount,
        String currency,
        BigDecimal budgetDays,
        BigDecimal totalPrice,
        Double remainingDays,
        Double progressDaysPercent,
        BigDecimal remainingAmount,
        Double progressAmountPercent
) {
    public ProjectBillingItem(
            UUID projectId,
            String projectName,
            String projectReference,
            String clientOrganization,
            int totalMinutes,
            int billableMinutes,
            double billableDays,
            BigDecimal dailyRate,
            BigDecimal totalAmount,
            int contributorsCount
    ) {
        this(projectId, projectName, projectReference, clientOrganization, totalMinutes,
                billableMinutes, billableDays, dailyRate, totalAmount, contributorsCount,
                "EUR", null, null, null, null, null, null);
    }
}
