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
        boolean editable,
        List<HolidayOverview> holidays,
        int overtimeMinutes,
        int extraTimeMinutes
) {
    public TimesheetOverview(
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
        this(
                id,
                userId,
                weekStart,
                weekEnd,
                status,
                submittedAt,
                validatedAt,
                lockedAt,
                weeklyTargetMinutes,
                totalMinutes,
                billableMinutes,
                internalMinutes,
                dailyTotals,
                lines,
                rejectionComment,
                editable,
                List.of(),
                Math.max(0, totalMinutes - weeklyTargetMinutes),
                0
        );
    }

    public record HolidayOverview(
            LocalDate date,
            String name,
            boolean isWorked
    ) {
    }

    public record TimesheetLineOverview(
            UUID projectId,
            String projectName,
            String clientName,
            String workItemId,
            String workItemTitle,
            String activityType,
            boolean billable,
            String comment,
            int lineTotalMinutes,
            List<DayEntryOverview> entries
    ) {
        public TimesheetLineOverview(
                UUID projectId,
                String projectName,
                String clientName,
                String activityType,
                boolean billable,
                String comment,
                int lineTotalMinutes,
                List<DayEntryOverview> entries
        ) {
            this(projectId, projectName, clientName, null, null, activityType, billable, comment, lineTotalMinutes, entries);
        }
    }

    public record DayEntryOverview(
            LocalDate date,
            int minutes,
            String comment
    ) {
        public DayEntryOverview(LocalDate date, int minutes) {
            this(date, minutes, null);
        }
    }
}
