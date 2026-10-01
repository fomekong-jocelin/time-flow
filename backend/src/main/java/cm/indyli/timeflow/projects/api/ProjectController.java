package cm.indyli.timeflow.projects.api;

import cm.indyli.timeflow.projects.application.ProjectService;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProjectController {
    private final ProjectService service;
    public ProjectController(ProjectService service) { this.service = service; }

    @GetMapping("/api/v1/projects")
    public List<ProjectStore.ProjectView> list() { return service.list(); }

    @GetMapping("/api/v1/admin/integrations/azure/projects")
    public ProjectService.IntegrationView integration() { return service.integration(); }

    @PostMapping("/api/v1/admin/integrations/azure/projects/sync")
    public ProjectService.SyncResult synchronize() { return service.synchronize(); }
}
