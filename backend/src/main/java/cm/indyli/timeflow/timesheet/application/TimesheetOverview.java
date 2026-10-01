package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TimesheetOverview(
        UUID id,
        UUID userId,
        LocalDate weekStart,
        LocalDate weekEnd,
        TimesheetStatus status,
        OffsetDateTime submittedAt,
        OffsetDateTime validatedAt,
        OffsetDateTime lockedAt,
        int weeklyTargetMinutes,
        int totalMinutes,
        int billableMinutes,
        int internalMinutes,
        Map<String, Integer> dailyTotals,
        List<TimesheetLineOverview> lines,
        String rejectionComment,
        boolean editable
) {
    public record TimesheetLineOverview(
            UUID projectId,
            String projectName,
            String clientName,
            String activityType,
            boolean billable,
            String comment,
            int lineTotalMinutes,
            List<DayEntryOverview> entries
    ) {
    }

    public record DayEntryOverview(
            LocalDate date,
            int minutes
    ) {
    }
}
