package cm.indyli.timeflow.workschedule.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.workschedule.application.WorkScheduleService;
import cm.indyli.timeflow.workschedule.application.WorkScheduleSummary;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class WorkScheduleUserController {

    private final WorkScheduleService workScheduleService;
    private final CurrentUserService currentUserService;

    public WorkScheduleUserController(WorkScheduleService workScheduleService, CurrentUserService currentUserService) {
        this.workScheduleService = workScheduleService;
        this.currentUserService = currentUserService;
    }

    @GetMapping({"/work-schedules/me", "/users/me/work-schedule"})
    @PreAuthorize("isAuthenticated()")
    public WorkScheduleSummary getMyWorkSchedule(Authentication authentication) {
        var principal = currentUserService.resolve(authentication);
        return workScheduleService.getForUser(principal.userId());
    }
}
