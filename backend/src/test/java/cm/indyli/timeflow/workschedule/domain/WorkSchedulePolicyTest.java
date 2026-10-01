package cm.indyli.timeflow.workschedule.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkSchedulePolicyTest {

    @Test
    @DisplayName("Devrait valider avec succès un profil standard 35h")
    void shouldValidateStandardProfileSuccessfully() {
        assertThatCode(() -> WorkSchedulePolicy.validateProfile(
                "STANDARD_35H",
                "Temps plein standard (35h)",
                2100,
                420,
                600,
                2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Devrait rejeter un code de profil vide ou trop court")
    void shouldRejectInvalidCode() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "A",
                "Temps plein",
                2100, 420, 600, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("code du profil");
    }

    @Test
    @DisplayName("Devrait rejeter un nom de profil trop court")
    void shouldRejectInvalidName() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "VALID_CODE",
                "AB",
                2100, 420, 600, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("nom du profil");
    }

    @Test
    @DisplayName("Devrait rejeter des heures cibles hebdomadaires hors limites")
    void shouldRejectInvalidWeeklyTarget() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "CODE", "Valid Name",
                0, 420, 600, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("cible hebdomadaire");

        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "CODE", "Valid Name",
                3700, 420, 600, 3700,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("cible hebdomadaire");
    }

    @Test
    @DisplayName("Devrait rejeter un seuil journalier maximum inférieur à la cible")
    void shouldRejectMaxDailySmallerThanTarget() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "CODE", "Valid Name",
                2100, 480, 420, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("seuil maximal quotidien");
    }

    @Test
    @DisplayName("Devrait rejeter un seuil hebdomadaire maximum inférieur à la cible")
    void shouldRejectMaxWeeklySmallerThanTarget() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateProfile(
                "CODE", "Valid Name",
                2100, 420, 600, 1800,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        )).isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("seuil maximal hebdomadaire");
    }

    @Test
    @DisplayName("Devrait rejeter des jours ouvrés vides ou invalides")
    void shouldRejectInvalidWorkingDays() {
        assertThatThrownBy(() -> WorkSchedulePolicy.validateWorkingDays(""))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("Au moins un jour ouvré");

        assertThatThrownBy(() -> WorkSchedulePolicy.validateWorkingDays("MONDAY,FUNDAY"))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("Jour ouvré invalide");
    }

    @Test
    @DisplayName("Devrait interdire la désactivation du profil par défaut")
    void shouldProhibitDeactivatingDefaultProfile() {
        assertThatThrownBy(() -> WorkSchedulePolicy.ensureCanDeactivate(true))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("Impossible de désactiver le profil de travail par défaut");

        assertThatCode(() -> WorkSchedulePolicy.ensureCanDeactivate(false))
                .doesNotThrowAnyException();
    }
}
