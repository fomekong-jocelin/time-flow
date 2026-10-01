package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.util.UUID;

public record UserBillingItem(
        UUID userId,
        String displayName,
        String email,
        String role,
        String workScheduleName,
        int totalMinutes,
        int billableMinutes,
        double billableDays,
        int overtimeMinutes,
        BigDecimal dailyRate,
        BigDecimal totalAmount
) {}
