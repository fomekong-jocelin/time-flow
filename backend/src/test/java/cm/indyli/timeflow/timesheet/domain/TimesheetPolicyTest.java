package cm.indyli.timeflow.timesheet.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TimesheetPolicyTest {

    private final LocalDate monday = LocalDate.of(2026, 10, 5);

    @Test
    void ensureValidWeekStart_acceptsMonday() {
        assertThatCode(() -> TimesheetPolicy.ensureValidWeekStart(monday))
                .doesNotThrowAnyException();
    }

    @Test
    void ensureValidWeekStart_rejectsTuesdayOrNull() {
        assertThatThrownBy(() -> TimesheetPolicy.ensureValidWeekStart(null))
                .isInstanceOf(TimesheetValidationException.class);

        assertThatThrownBy(() -> TimesheetPolicy.ensureValidWeekStart(LocalDate.of(2026, 10, 6)))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("doit être un lundi");
    }

    @Test
    void ensureCanEdit_allowsDraftAndRejected() {
        assertThatCode(() -> TimesheetPolicy.ensureCanEdit(TimesheetStatus.DRAFT))
                .doesNotThrowAnyException();
        assertThatCode(() -> TimesheetPolicy.ensureCanEdit(TimesheetStatus.REJECTED))
                .doesNotThrowAnyException();
    }

    @Test
    void ensureCanEdit_rejectsSubmittedValidatedLocked() {
        assertThatThrownBy(() -> TimesheetPolicy.ensureCanEdit(TimesheetStatus.SUBMITTED))
                .isInstanceOf(TimesheetStatusException.class);
        assertThatThrownBy(() -> TimesheetPolicy.ensureCanEdit(TimesheetStatus.VALIDATED))
                .isInstanceOf(TimesheetStatusException.class);
        assertThatThrownBy(() -> TimesheetPolicy.ensureCanEdit(TimesheetStatus.LOCKED))
                .isInstanceOf(TimesheetStatusException.class);
    }

    @Test
    void ensureEntryInWeek_validatesWithinMondayAndSunday() {
        assertThatCode(() -> TimesheetPolicy.ensureEntryInWeek(monday, monday))
                .doesNotThrowAnyException();
        assertThatCode(() -> TimesheetPolicy.ensureEntryInWeek(monday.plusDays(6), monday))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> TimesheetPolicy.ensureEntryInWeek(monday.minusDays(1), monday))
                .isInstanceOf(TimesheetValidationException.class);
        assertThatThrownBy(() -> TimesheetPolicy.ensureEntryInWeek(monday.plusDays(7), monday))
                .isInstanceOf(TimesheetValidationException.class);
    }

    @Test
    void ensureDailyTotalsWithinLimit_rejectsExceeding12Hours() {
        Map<LocalDate, Integer> valid = Map.of(monday, 480, monday.plusDays(1), 720);
        assertThatCode(() -> TimesheetPolicy.ensureDailyTotalsWithinLimit(valid))
                .doesNotThrowAnyException();

        Map<LocalDate, Integer> invalid = Map.of(monday, 721);
        assertThatThrownBy(() -> TimesheetPolicy.ensureDailyTotalsWithinLimit(invalid))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("dépasse la limite légale maximale de 12 h");
    }

    @Test
    void ensureCanSubmit_requiresNonZeroMinutesAndUnderWeeklyCap() {
        assertThatCode(() -> TimesheetPolicy.ensureCanSubmit(TimesheetStatus.DRAFT, 420))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> TimesheetPolicy.ensureCanSubmit(TimesheetStatus.DRAFT, 0))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("0 heure ne peut pas être soumise");

        assertThatThrownBy(() -> TimesheetPolicy.ensureCanSubmit(TimesheetStatus.DRAFT, 3601))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("dépasse le plafond absolu dérogatoire de 60 h");
    }
}
