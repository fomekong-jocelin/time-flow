package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PendingTimesheetSummary(
        UUID id,
        UUID userId,
        String userDisplayName,
        String userEmail,
        LocalDate weekStart,
        LocalDate weekEnd,
        TimesheetStatus status,
        OffsetDateTime submittedAt,
        int totalMinutes,
        int billableMinutes,
        int linesCount
) {
}
