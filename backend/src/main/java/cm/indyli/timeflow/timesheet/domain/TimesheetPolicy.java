package cm.indyli.timeflow.timesheet.domain;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;

public final class TimesheetPolicy {

    public static final int MAX_MINUTES_PER_DAY = 1440; // 24 hours

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
        if (minutes < 0 || minutes > MAX_MINUTES_PER_DAY) {
            throw new TimesheetValidationException(
                    "La durée d'une entrée doit être comprise entre 0 et " + MAX_MINUTES_PER_DAY + " minutes (24 h)."
            );
        }
    }

    public static void ensureDailyTotalsWithinLimit(Map<LocalDate, Integer> dailyTotals) {
        if (dailyTotals == null) {
            return;
        }
        for (var entry : dailyTotals.entrySet()) {
            if (entry.getValue() > MAX_MINUTES_PER_DAY) {
                throw new TimesheetValidationException(
                        "Le total saisi pour le jour " + entry.getKey() + " dépasse la limite autorisée de 24 h (" + entry.getValue() + " min)."
                );
            }
        }
    }

    public static void ensureCanSubmit(TimesheetStatus status, int totalMinutes) {
        ensureCanEdit(status);
        if (totalMinutes <= 0) {
            throw new TimesheetValidationException("Une feuille de temps avec 0 heure ne peut pas être soumise.");
        }
    }
}
