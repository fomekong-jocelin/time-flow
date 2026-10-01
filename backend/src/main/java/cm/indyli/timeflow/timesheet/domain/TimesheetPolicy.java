package cm.indyli.timeflow.timesheet.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;

/**
 * Règles métier et de conformité légale régissant les feuilles de temps (CRA).
 * Conforme au Code du travail (L. 3121-18, L. 3121-19, L. 3121-20, L. 3121-21) et convention Syntec.
 */
public final class TimesheetPolicy {

    /** Durée maximale légale quotidienne normale (10 h = 600 min, Art. L. 3121-18). */
    public static final int STATUTORY_MAX_DAILY_MINUTES = 600;

    /** Durée maximale quotidienne dérogatoire absolue (12 h = 720 min, Art. L. 3121-19). */
    public static final int ABSOLUTE_MAX_DAILY_MINUTES = 720;

    /** Durée maximale légale hebdomadaire absolue au cours d'une semaine (48 h = 2880 min, Art. L. 3121-20). */
    public static final int STATUTORY_MAX_WEEKLY_MINUTES = 2880;

    /** Plafond dérogatoire exceptionnel hebdomadaire avec autorisation administrative (60 h = 3600 min, Art. L. 3121-21). */
    public static final int ABSOLUTE_MAX_WEEKLY_MINUTES = 3600;

    /** Limite journalière maximale absolue. */
    public static final int MAX_MINUTES_PER_DAY = ABSOLUTE_MAX_DAILY_MINUTES;

    private TimesheetPolicy() {
    }

    public static void ensureValidWeekStart(LocalDate weekStart) {
        if (weekStart == null) {
            throw new TimesheetValidationException("La date de début de semaine est obligatoire.");
        }
        if (weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new TimesheetValidationException("La date de début de semaine doit être un lundi.");
        }
    }

    public static void ensureCanEdit(TimesheetStatus status) {
        if (status == null) {
            return;
        }
        if (status != TimesheetStatus.DRAFT && status != TimesheetStatus.REJECTED) {
            throw new TimesheetStatusException("La feuille de temps en statut " + status + " ne peut plus être modifiée.");
        }
    }

    public static void ensureEntryInWeek(LocalDate entryDate, LocalDate weekStart) {
        if (entryDate == null) {
            throw new TimesheetValidationException("La date de l'entrée est obligatoire.");
        }
        LocalDate weekEnd = weekStart.plusDays(6);
        if (entryDate.isBefore(weekStart) || entryDate.isAfter(weekEnd)) {
            throw new TimesheetValidationException(
                    "La date " + entryDate + " ne se situe pas dans la semaine du " + weekStart + " au " + weekEnd + "."
            );
        }
    }

    public static void ensureValidMinutes(int minutes) {
        if (minutes < 0 || minutes > ABSOLUTE_MAX_DAILY_MINUTES) {
            throw new TimesheetValidationException(
                    "La durée d'une entrée doit être comprise entre 0 et " + ABSOLUTE_MAX_DAILY_MINUTES + " minutes (12 h)."
            );
        }
    }

    public static void ensureDailyTotalsWithinLimit(Map<LocalDate, Integer> dailyTotals) {
        if (dailyTotals == null) {
            return;
        }
        for (var entry : dailyTotals.entrySet()) {
            if (entry.getValue() > ABSOLUTE_MAX_DAILY_MINUTES) {
                throw new TimesheetValidationException(
                        "Le total saisi pour le jour " + entry.getKey() + " dépasse la limite légale maximale de 12 h (" + entry.getValue() + " min)."
                );
            }
        }
    }

    public static void ensureWeeklyTotalsWithinLimit(int totalMinutes) {
        if (totalMinutes > ABSOLUTE_MAX_WEEKLY_MINUTES) {
            throw new TimesheetValidationException(
                    "Le total hebdomadaire (" + (totalMinutes / 60) + " h) dépasse le plafond absolu dérogatoire de 60 h autorisées par le Code du travail."
            );
        }
    }

    public static void ensureCanSubmit(TimesheetStatus status, int totalMinutes) {
        ensureCanEdit(status);
        if (totalMinutes <= 0) {
            throw new TimesheetValidationException("Une feuille de temps avec 0 heure ne peut pas être soumise.");
        }
        ensureWeeklyTotalsWithinLimit(totalMinutes);
    }
}
