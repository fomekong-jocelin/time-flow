package cm.indyli.timeflow.timesheet.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TimesheetStatusTransitionsTest {

    @Test
    void shouldAllowNominalWorkflow() {
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.DRAFT, TimesheetStatus.SUBMITTED)).isTrue();
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.SUBMITTED, TimesheetStatus.VALIDATED)).isTrue();
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.VALIDATED, TimesheetStatus.LOCKED)).isTrue();
    }

    @Test
    void shouldAllowRejectionAndCorrection() {
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.SUBMITTED, TimesheetStatus.REJECTED)).isTrue();
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.REJECTED, TimesheetStatus.DRAFT)).isTrue();
    }

    @Test
    void shouldRejectInvalidTransitions() {
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.DRAFT, TimesheetStatus.VALIDATED)).isFalse();
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.LOCKED, TimesheetStatus.DRAFT)).isFalse();
        assertThat(TimesheetStatusTransitions.canTransition(TimesheetStatus.DRAFT, TimesheetStatus.DRAFT)).isFalse();
    }
}
