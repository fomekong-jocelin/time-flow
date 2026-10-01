package cm.indyli.timeflow.timesheet.application;

import java.util.List;
import java.util.UUID;

public record ManagerTimesheetDetail(
        UUID timesheetId,
        UUID userId,
        String userDisplayName,
        String userEmail,
        TimesheetOverview overview,
        List<ValidationHistoryItem> history
) {
    public record ValidationHistoryItem(
            UUID id,
            String decision,
            String comment,
            String validatorDisplayName,
            String decidedAt
    ) {
    }
}
