package cm.indyli.timeflow.workschedule.domain;

import java.util.List;

public final class WorkSchedulePolicy {

    private static final List<String> VALID_DAYS = List.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );

    private WorkSchedulePolicy() {
    }

    public static void validateProfile(
            String code,
            String name,
            int weeklyTargetMinutes,
            int dailyTargetMinutes,
            int maxDailyMinutes,
            int maxWeeklyMinutes,
            String workingDays
    ) {
        if (code == null || code.trim().length() < 2 || code.trim().length() > 50) {
            throw new WorkScheduleValidationException("Le code du profil doit comporter entre 2 et 50 caractères.");
        }
        if (name == null || name.trim().length() < 3 || name.trim().length() > 100) {
            throw new WorkScheduleValidationException("Le nom du profil doit comporter entre 3 et 100 caractères.");
        }
        if (weeklyTargetMinutes <= 0 || weeklyTargetMinutes > 3600) {
            throw new WorkScheduleValidationException("Le temps cible hebdomadaire doit être compris entre 1 et 60 heures (3600 min).");
        }
        if (dailyTargetMinutes <= 0 || dailyTargetMinutes > 720) {
            throw new WorkScheduleValidationException("Le temps cible quotidien doit être compris entre 1 et 12 heures (720 min).");
        }
        if (maxDailyMinutes < dailyTargetMinutes || maxDailyMinutes > 720) {
            throw new WorkScheduleValidationException("Le seuil maximal quotidien doit être supérieur ou égal au temps cible et inférieur ou égal à 12 h.");
        }
        if (maxWeeklyMinutes < weeklyTargetMinutes || maxWeeklyMinutes > 3600) {
            throw new WorkScheduleValidationException("Le seuil maximal hebdomadaire doit être supérieur ou égal au temps cible et inférieur ou égal à 60 h.");
        }
        validateWorkingDays(workingDays);
    }

    public static void validateWorkingDays(String workingDays) {
        if (workingDays == null || workingDays.isBlank()) {
            throw new WorkScheduleValidationException("Au moins un jour ouvré de travail doit être configuré.");
        }
        String[] days = workingDays.split(",");
        for (String day : days) {
            if (!VALID_DAYS.contains(day.trim().toUpperCase())) {
                throw new WorkScheduleValidationException("Jour ouvré invalide : " + day);
            }
        }
    }

    public static void ensureCanDeactivate(boolean isDefault) {
        if (isDefault) {
            throw new WorkScheduleValidationException("Impossible de désactiver le profil de travail par défaut.");
        }
    }
}
