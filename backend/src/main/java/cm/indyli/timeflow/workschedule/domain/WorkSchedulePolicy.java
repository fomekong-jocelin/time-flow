package cm.indyli.timeflow.workschedule.domain;

import java.math.BigDecimal;
import java.util.List;

public final class WorkSchedulePolicy {

    private static final List<String> VALID_DAYS = List.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );

    private static final List<String> VALID_COMPENSATION_MODES = List.of(
            "PAY", "RECOVERY", "HYBRID"
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

    public static void validateOtEt(
            int overtimeThresholdMinutes,
            BigDecimal overtimeRateTier1,
            BigDecimal overtimeRateTier2,
            BigDecimal overtimeRateHoliday,
            String overtimeCompensationMode,
            int extraTimeMaxWeeklyMinutes,
            BigDecimal extraTimeRate,
            String extraTimeCompensationMode
    ) {
        if (overtimeThresholdMinutes < 0 || overtimeThresholdMinutes > 3600) {
            throw new WorkScheduleValidationException("Le seuil d'heures supplémentaires (OT) doit être compris entre 0 et 60 heures.");
        }
        if (overtimeRateTier1 != null && overtimeRateTier1.compareTo(BigDecimal.ONE) < 0) {
            throw new WorkScheduleValidationException("Le taux de majoration OT tranche 1 doit être supérieur ou égal à 1.00.");
        }
        if (overtimeRateTier2 != null && overtimeRateTier2.compareTo(BigDecimal.ONE) < 0) {
            throw new WorkScheduleValidationException("Le taux de majoration OT tranche 2 doit être supérieur ou égal à 1.00.");
        }
        if (overtimeRateHoliday != null && overtimeRateHoliday.compareTo(BigDecimal.ONE) < 0) {
            throw new WorkScheduleValidationException("Le taux de majoration OT dimanche / férié doit être supérieur ou égal à 1.00.");
        }
        if (overtimeCompensationMode != null && !VALID_COMPENSATION_MODES.contains(overtimeCompensationMode.toUpperCase())) {
            throw new WorkScheduleValidationException("Mode de compensation OT invalide (PAY, RECOVERY, HYBRID).");
        }
        if (extraTimeMaxWeeklyMinutes < 0 || extraTimeMaxWeeklyMinutes > 3600) {
            throw new WorkScheduleValidationException("Le plafond d'extra time (ET) doit être compris entre 0 et 60 heures.");
        }
        if (extraTimeRate != null && extraTimeRate.compareTo(BigDecimal.ONE) < 0) {
            throw new WorkScheduleValidationException("Le taux de majoration ET doit être supérieur ou égal à 1.00.");
        }
        if (extraTimeCompensationMode != null && !VALID_COMPENSATION_MODES.contains(extraTimeCompensationMode.toUpperCase())) {
            throw new WorkScheduleValidationException("Mode de compensation ET invalide (PAY, RECOVERY, HYBRID).");
        }
    }

    public static void ensureCanDeactivate(boolean isDefault) {
        if (isDefault) {
            throw new WorkScheduleValidationException("Impossible de désactiver le profil de travail par défaut.");
        }
    }
}
