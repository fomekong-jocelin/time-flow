package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;

/** Priced amount in one unit only; unpriced time must never be presented as free. */
public record MoneyTotal(String currency, BigDecimal amount, int unpricedBillableMinutes) {}
