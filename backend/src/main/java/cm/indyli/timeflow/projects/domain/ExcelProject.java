package cm.indyli.timeflow.projects.domain;

import java.math.BigDecimal;

public record ExcelProject(
        String reference,
        String name,
        boolean active,
        boolean billable,
        BigDecimal dailyRate,
        BigDecimal budgetDays,
        BigDecimal totalPrice,
        String currency
) {
    public ExcelProject(String reference, String name, boolean active, boolean billable) {
        this(reference, name, active, billable, null, null, null, "EUR");
    }

    public ExcelProject {
        if (reference == null || !reference.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,99}")) {
            throw new IllegalArgumentException("Référence : 1 à 100 lettres, chiffres, points, tirets ou underscores.");
        }
        if (name == null || name.isBlank() || name.length() > 255) {
            throw new IllegalArgumentException("Nom obligatoire, limité à 255 caractères.");
        }
        if (currency == null || currency.isBlank()) {
            currency = "EUR";
        } else {
            currency = currency.trim().toUpperCase();
        }
    }
}
