package cm.indyli.timeflow.timesheet.application;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record SaveTimesheetCommand(
        @NotNull List<@Valid LineCommand> lines
) {
    public record LineCommand(
            @NotNull UUID projectId,
            @Size(max = 100) String workItemId,
            @Size(max = 255) String workItemTitle,
            @NotBlank @Pattern(regexp = "PROJECT|TRAINING|SUPPORT|INTERNAL") String activityType,
            Boolean billable,
            @Size(max = 1000) String comment,
            @NotNull List<@Valid EntryCommand> entries
    ) {
        public LineCommand(UUID projectId, String activityType, Boolean billable, String comment, List<EntryCommand> entries) {
            this(projectId, null, null, activityType, billable, comment, entries);
        }
    }

    public record EntryCommand(
            @NotNull LocalDate entryDate,
            @Min(0) @Max(1440) int minutes,
            @Size(max = 1000) String comment
    ) {
        public EntryCommand(LocalDate entryDate, int minutes) {
            this(entryDate, minutes, null);
        }
    }
}
