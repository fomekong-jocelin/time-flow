package cm.indyli.timeflow.timesheet.domain;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public final class TimesheetStatusTransitions {

    private static final Map<TimesheetStatus, Set<TimesheetStatus>> ALLOWED = Map.of(
            TimesheetStatus.DRAFT, EnumSet.of(TimesheetStatus.SUBMITTED),
            TimesheetStatus.SUBMITTED, EnumSet.of(TimesheetStatus.REJECTED, TimesheetStatus.VALIDATED),
            TimesheetStatus.REJECTED, EnumSet.of(TimesheetStatus.DRAFT),
            TimesheetStatus.VALIDATED, EnumSet.of(TimesheetStatus.LOCKED),
            TimesheetStatus.LOCKED, EnumSet.noneOf(TimesheetStatus.class)
    );

    private TimesheetStatusTransitions() {
    }

    public static boolean canTransition(TimesheetStatus from, TimesheetStatus to) {
        if (from == null || to == null || from == to) {
            return false;
        }
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }
}
