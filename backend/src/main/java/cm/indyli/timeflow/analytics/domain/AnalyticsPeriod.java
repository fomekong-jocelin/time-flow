package cm.indyli.timeflow.analytics.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.Locale;

public record AnalyticsPeriod(
        String rawPeriod,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate startWeek,
        LocalDate endWeek
) {
    public static AnalyticsPeriod parse(String periodStr) {
        LocalDate today = LocalDate.now();
        if (periodStr == null || periodStr.isBlank() || "current".equalsIgnoreCase(periodStr.trim())) {
            YearMonth ym = YearMonth.from(today);
            return fromYearMonth(ym, ym.toString());
        }

        String cleaned = periodStr.trim();
        // Check YYYY-MM
        if (cleaned.matches("^\\d{4}-\\d{2}$")) {
            YearMonth ym = YearMonth.parse(cleaned);
            return fromYearMonth(ym, cleaned);
        }

        // Check YYYY-Q[1-4]
        if (cleaned.matches("^\\d{4}-Q[1-4]$")) {
            int year = Integer.parseInt(cleaned.substring(0, 4));
            int quarter = Integer.parseInt(cleaned.substring(6));
            Month startMonth = Month.of((quarter - 1) * 3 + 1);
            LocalDate start = LocalDate.of(year, startMonth, 1);
            LocalDate end = YearMonth.of(year, quarter * 3).atEndOfMonth();
            String label = "Trimestre " + quarter + " " + year;
            return new AnalyticsPeriod(
                    cleaned,
                    label,
                    start,
                    end,
                    start.with(DayOfWeek.MONDAY),
                    end.with(DayOfWeek.MONDAY)
            );
        }

        // Check YYYY
        if (cleaned.matches("^\\d{4}$")) {
            int year = Integer.parseInt(cleaned);
            LocalDate start = LocalDate.of(year, 1, 1);
            LocalDate end = LocalDate.of(year, 12, 31);
            String label = "Année " + year;
            return new AnalyticsPeriod(
                    cleaned,
                    label,
                    start,
                    end,
                    start.with(DayOfWeek.MONDAY),
                    end.with(DayOfWeek.MONDAY)
            );
        }

        // Fallback: current month
        YearMonth ym = YearMonth.from(today);
        return fromYearMonth(ym, ym.toString());
    }

    private static AnalyticsPeriod fromYearMonth(YearMonth ym, String raw) {
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        String monthName = start.getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        monthName = monthName.substring(0, 1).toUpperCase(Locale.ROOT) + monthName.substring(1);
        String label = monthName + " " + ym.getYear();
        return new AnalyticsPeriod(
                raw,
                label,
                start,
                end,
                start.with(DayOfWeek.MONDAY),
                end.with(DayOfWeek.MONDAY)
        );
    }
}
