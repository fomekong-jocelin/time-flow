package cm.indyli.timeflow.projects.application;

import cm.indyli.timeflow.projects.infrastructure.AzureProjectsClient;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import java.util.List;
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
    public List<ProjectStore.ProjectView> list() { return store.list(); }

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
