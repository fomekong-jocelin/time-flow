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
        int contributorsCount
) {}
