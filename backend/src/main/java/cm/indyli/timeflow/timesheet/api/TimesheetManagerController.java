package cm.indyli.timeflow.timesheet.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.timesheet.application.ManagerTimesheetDetail;
import cm.indyli.timeflow.timesheet.application.PendingTimesheetSummary;
import cm.indyli.timeflow.timesheet.application.SubordinateSummary;
import cm.indyli.timeflow.timesheet.application.TimesheetValidationService;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/manager/timesheets")
@PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
public class TimesheetManagerController {

    private final TimesheetValidationService validationService;
    private final CurrentUserService currentUserService;

    public TimesheetManagerController(TimesheetValidationService validationService,
                                      CurrentUserService currentUserService) {
        this.validationService = validationService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/subordinates")
    public List<cm.indyli.timeflow.timesheet.application.SubordinateSummary> listSubordinates(Authentication authentication) {
        var principal = currentUserService.resolve(authentication);
        return validationService.getManagedUsers(principal);
    }

    @GetMapping
    public List<PendingTimesheetSummary> listPending(
            @RequestParam(required = false, defaultValue = "SUBMITTED") String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromWeek,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toWeek,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        TimesheetStatus statusFilter = null;
        if (status != null && !status.equalsIgnoreCase("ALL") && !status.isBlank()) {
            statusFilter = TimesheetStatus.valueOf(status.toUpperCase());
        }
        return validationService.listPending(principal, statusFilter, weekStart, userId, projectId, fromWeek, toWeek);
    }

    @GetMapping("/view")
    public ManagerTimesheetDetail viewSubordinateWeek(
            @RequestParam UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return validationService.getSubordinateWeekDetail(principal, userId, weekStart);
    }

    @GetMapping("/{timesheetId}")
    public ManagerTimesheetDetail getDetail(
            @PathVariable UUID timesheetId,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return validationService.getTimesheetDetail(principal, timesheetId);
    }

    @PostMapping("/{timesheetId}/validate")
    public ManagerTimesheetDetail validate(
            @PathVariable UUID timesheetId,
            @RequestBody(required = false) ValidateRequest request,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        String comment = request != null ? request.comment() : null;
        return validationService.validate(principal, timesheetId, comment);
    }

    @PostMapping("/{timesheetId}/reject")
    public ManagerTimesheetDetail reject(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody RejectRequest request,
            Authentication authentication
    ) {
        var principal = currentUserService.resolve(authentication);
        return validationService.reject(principal, timesheetId, request.comment());
    }

    public record ValidateRequest(String comment) {
    }

    public record RejectRequest(
            @NotBlank(message = "Le motif de rejet est obligatoire.")
            @Size(min = 3, max = 1000, message = "Le motif doit contenir entre 3 et 1000 caractères.")
            String comment
    ) {
    }
}
