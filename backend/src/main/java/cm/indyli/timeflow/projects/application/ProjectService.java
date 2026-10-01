package cm.indyli.timeflow.projects.application;

import cm.indyli.timeflow.projects.api.ProjectController.CreateProjectRequest;
import cm.indyli.timeflow.projects.api.ProjectController.UpdateProjectRequest;
import cm.indyli.timeflow.projects.infrastructure.AzureProjectsClient;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {
    private final ProjectStore store;
    private final AzureProjectsClient azure;
    private final AtomicBoolean running = new AtomicBoolean();

    public ProjectService(ProjectStore store, AzureProjectsClient azure) {
        this.store = store;
        this.azure = azure;
    }

    @PreAuthorize("isAuthenticated()")
    public List<ProjectStore.ProjectView> list() {
        return store.list();
    }

    @PreAuthorize("isAuthenticated()")
    public List<ProjectStore.ProjectView> list(boolean canViewFinancials) {
        var all = store.list();
        if (canViewFinancials) {
            return all;
        }
        return all.stream()
                .map(p -> new ProjectStore.ProjectView(
                        p.id(), p.name(), p.source(), p.organization(),
                        p.active(), p.billableDefault(), p.reference(),
                        null, p.budgetDays(), null, p.currency()
                ))
                .toList();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public ProjectStore.ProjectView create(CreateProjectRequest request) {
        UUID id = store.create(
                request.name(),
                request.active(),
                request.billableDefault(),
                request.dailyRate(),
                request.budgetDays(),
                request.totalPrice(),
                request.currency()
        );
        return store.findById(id).orElseThrow();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public ProjectStore.ProjectView update(UUID id, UpdateProjectRequest request) {
        store.update(
                id,
                request.name(),
                request.active(),
                request.billableDefault(),
                request.dailyRate(),
                request.budgetDays(),
                request.totalPrice(),
                request.currency()
        );
        return store.findById(id).orElseThrow();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public IntegrationView integration() { return new IntegrationView(azure.configured(), store.latestRun()); }

    @PreAuthorize("hasRole('ADMIN')")
    public SyncResult synchronize() {
        if (!azure.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Intégration non configurée.");
        if (!running.compareAndSet(false, true)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Synchronisation en cours.");
        try {
            var runId = store.startRun();
            try {
                var projects = azure.fetchAll();
                store.importProjects(runId, azure.organization(), projects);
                return new SyncResult(projects.size());
            } catch (RuntimeException exception) {
                store.failRun(runId);
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Synchronisation impossible. Vérifiez les accès Azure DevOps.");
            }
        } finally {
            running.set(false);
        }
    }

    public record IntegrationView(boolean configured, ProjectStore.SyncView latestRun) { }
    public record SyncResult(int importedCount) { }
}
