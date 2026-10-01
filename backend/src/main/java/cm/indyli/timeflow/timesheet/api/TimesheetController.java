package cm.indyli.timeflow.timesheet.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.timesheet.application.SaveTimesheetCommand;
import cm.indyli.timeflow.timesheet.application.TimesheetOverview;
import cm.indyli.timeflow.timesheet.application.TimesheetService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

@RestController
@RequestMapping("/api/v1/timesheets")
public class TimesheetController {

    private final TimesheetService timesheetService;
    private final CurrentUserService currentUserService;

    public TimesheetController(TimesheetService timesheetService, CurrentUserService currentUserService) {
        this.timesheetService = timesheetService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview getTimesheet(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        LocalDate targetWeekStart = weekStart != null
                ? weekStart
                : LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        return timesheetService.getTimesheet(principal.userId(), targetWeekStart);
    }

    @PutMapping("/{weekStart}")
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview saveDraft(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @Valid @RequestBody SaveTimesheetCommand command,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return timesheetService.saveDraft(principal.userId(), weekStart, command);
    }

    @PostMapping("/{weekStart}/submit")
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview submit(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @Valid @RequestBody(required = false) SaveTimesheetCommand optionalCommand,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return timesheetService.submit(principal.userId(), weekStart, optionalCommand);
    }
}
