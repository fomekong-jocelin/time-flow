package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record BillingDetailItem(
        LocalDate entryDate,
        UUID userId,
        String userDisplayName,
        UUID projectId,
        String projectName,
        String activityType,
        int minutes,
        boolean billable,
        double billableDays,
        BigDecimal dailyRate,
        BigDecimal totalAmount,
        String comment
) {}
