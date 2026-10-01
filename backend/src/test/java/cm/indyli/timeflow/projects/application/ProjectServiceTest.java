package cm.indyli.timeflow.projects.application;

import cm.indyli.timeflow.projects.domain.RemoteProject;
import cm.indyli.timeflow.projects.infrastructure.AzureProjectsClient;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectServiceTest {
    private final ProjectStore store = mock(ProjectStore.class);
    private final AzureProjectsClient azure = mock(AzureProjectsClient.class);
    private final ProjectService service = new ProjectService(store, azure);

    @Test
    void importsCompleteSnapshotAndAuditsSuccess() {
        var id = UUID.randomUUID();
        var projects = List.of(new RemoteProject(UUID.randomUUID(), "Mission", "wellFormed"));
        when(azure.configured()).thenReturn(true);
        when(azure.organization()).thenReturn("example");
        when(store.startRun()).thenReturn(id);
        when(azure.fetchAll()).thenReturn(projects);
        assertThat(service.synchronize().importedCount()).isEqualTo(1);
        verify(store).importProjects(id, "example", projects);
        verify(store, never()).failRun(any());
    }

    @Test
    void failureIsAuditedAndDoesNotLeakRemoteErrorOrImportPartialResults() {
        var id = UUID.randomUUID();
        when(azure.configured()).thenReturn(true);
        when(store.startRun()).thenReturn(id);
        when(azure.fetchAll()).thenThrow(new IllegalStateException("sensitive remote details"));
        assertThatThrownBy(service::synchronize).isInstanceOf(ResponseStatusException.class)
                .hasMessageNotContaining("sensitive").hasNoCause();
        verify(store).failRun(id);
        verify(store, never()).importProjects(any(), any(), any());
        // The in-process lock must be released even on failure.
        doReturn(List.of()).when(azure).fetchAll();
        assertThat(service.synchronize().importedCount()).isZero();
    }

    @Test
    void disabledIntegrationDoesNotStartARun() {
        assertThatThrownBy(service::synchronize).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(store);
    }
}
