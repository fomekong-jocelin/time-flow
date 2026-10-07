package cm.indyli.timeflow.analytics.application;

import java.time.LocalDate;

/**
 * Tendance journalière des heures déclarées pour la période d'analyse.
 */
public record DailyTrendItem(
        LocalDate date,
        String label,
        int dayOfMonth,
        int totalMinutes,
        int billableMinutes
) {}
