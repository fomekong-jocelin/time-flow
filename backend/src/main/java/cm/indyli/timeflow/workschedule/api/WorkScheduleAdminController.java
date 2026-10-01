package cm.indyli.timeflow.workschedule.api;

import cm.indyli.timeflow.workschedule.application.CreateWorkScheduleCommand;
import cm.indyli.timeflow.workschedule.application.UpdateWorkScheduleCommand;
import cm.indyli.timeflow.workschedule.application.WorkScheduleService;
import cm.indyli.timeflow.workschedule.application.WorkScheduleSummary;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/work-schedules")
@PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
public class WorkScheduleAdminController {

    private final WorkScheduleService workScheduleService;

    public WorkScheduleAdminController(WorkScheduleService workScheduleService) {
        this.workScheduleService = workScheduleService;
    }

    @GetMapping
    public List<WorkScheduleSummary> listAll(@RequestParam(defaultValue = "true") boolean includeInactive) {
        return workScheduleService.listAll(includeInactive);
    }

    @GetMapping("/{id}")
    public WorkScheduleSummary getById(@PathVariable UUID id) {
        return workScheduleService.getById(id);
    }

    @PostMapping
    public ResponseEntity<WorkScheduleSummary> create(@Valid @RequestBody CreateWorkScheduleCommand cmd) {
        var created = workScheduleService.create(cmd);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public WorkScheduleSummary update(@PathVariable UUID id, @Valid @RequestBody UpdateWorkScheduleCommand cmd) {
        return workScheduleService.update(id, cmd);
    }

    @PostMapping("/{id}/set-default")
    public WorkScheduleSummary setDefault(@PathVariable UUID id) {
        return workScheduleService.setDefault(id);
    }

    @PostMapping("/{id}/toggle-active")
    public WorkScheduleSummary toggleActive(@PathVariable UUID id) {
        return workScheduleService.toggleActive(id);
    }
}
