package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record UserBillingItem(
        UUID userId, String displayName, String email, String role, String workScheduleName,
        int totalMinutes, int billableMinutes, double billableDays, int overtimeMinutes,
        BigDecimal dailyRate, BigDecimal totalAmount, String dailyRateCurrency, List<MoneyTotal> moneyTotals
) {
    public UserBillingItem(UUID userId, String displayName, String email, String role, String workScheduleName,
            int totalMinutes, int billableMinutes, double billableDays, int overtimeMinutes,
            BigDecimal dailyRate, BigDecimal totalAmount) {
        this(userId, displayName, email, role, workScheduleName, totalMinutes, billableMinutes, billableDays,
                overtimeMinutes, dailyRate, totalAmount, dailyRate == null ? null : "EUR",
                totalAmount == null ? List.of() : List.of(new MoneyTotal("EUR", totalAmount, 0)));
    }
}
