package cm.indyli.timeflow.billing.application;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/** Groups native currencies. No implicit FX conversion or cross-currency addition. */
public final class MoneyTotals {
    private final Map<String, MoneyTotal> values = new TreeMap<>();
    public void add(String currency, BigDecimal amount, int unpricedMinutes) {
        String unit = normalize(currency);
        MoneyTotal before = values.getOrDefault(unit, new MoneyTotal(unit, BigDecimal.ZERO, 0));
        values.put(unit, new MoneyTotal(unit, before.amount().add(amount == null ? BigDecimal.ZERO : amount),
                before.unpricedBillableMinutes() + unpricedMinutes));
    }
    public List<MoneyTotal> items() { return List.copyOf(values.values()); }
    public BigDecimal singleCompleteAmount() {
        if (values.isEmpty()) return BigDecimal.ZERO;
        if (values.size() != 1) return null;
        var value = values.values().iterator().next();
        return value.unpricedBillableMinutes() == 0 ? value.amount() : null;
    }
    public static String normalize(String currency) {
        return currency == null || currency.isBlank() ? "EUR" : currency.trim().toUpperCase(Locale.ROOT);
    }
}
