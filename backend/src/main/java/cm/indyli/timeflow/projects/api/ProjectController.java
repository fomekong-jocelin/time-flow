package cm.indyli.timeflow.projects.api;

import cm.indyli.timeflow.projects.application.ProjectService;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/projects")
    public List<ProjectStore.ProjectView> list(Authentication authentication) {
        boolean canViewFinancials = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_DIRECTION".equals(a.getAuthority()));
        return service.list(canViewFinancials);
    }

    @PostMapping("/api/v1/admin/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectStore.ProjectView create(@Valid @RequestBody CreateProjectRequest request) {
        return service.create(request);
    }

    @PutMapping("/api/v1/admin/projects/{id}")
    public ProjectStore.ProjectView update(@PathVariable UUID id, @Valid @RequestBody UpdateProjectRequest request) {
        return service.update(id, request);
    }

    @GetMapping("/api/v1/admin/integrations/azure/projects")
    public ProjectService.IntegrationView integration() { return service.integration(); }

    @PostMapping("/api/v1/admin/integrations/azure/projects/sync")
    public ProjectService.SyncResult synchronize() { return service.synchronize(); }

    public record CreateProjectRequest(
            @NotBlank @Size(max = 255) String name,
            boolean active,
            boolean billableDefault,
            @PositiveOrZero BigDecimal dailyRate,
            @PositiveOrZero BigDecimal budgetDays,
            @PositiveOrZero BigDecimal totalPrice,
            @Size(max = 10) String currency
    ) {}

    public record UpdateProjectRequest(
            @NotBlank @Size(max = 255) String name,
            boolean active,
            boolean billableDefault,
            @PositiveOrZero BigDecimal dailyRate,
            @PositiveOrZero BigDecimal budgetDays,
            @PositiveOrZero BigDecimal totalPrice,
            @Size(max = 10) String currency
    ) {}
}
