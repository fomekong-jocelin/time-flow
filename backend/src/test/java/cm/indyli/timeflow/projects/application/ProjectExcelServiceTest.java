package cm.indyli.timeflow.projects.application;

import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.projects.infrastructure.ProjectWorkbook;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProjectExcelServiceTest {
    private final ProjectStore store = mock(ProjectStore.class);
    private final ProjectWorkbook workbook = new ProjectWorkbook();
    private final ProjectExcelService service = new ProjectExcelService(store, workbook);

    @Test
    void validatesCompleteWorkbookBeforeWriting() {
        UUID run = UUID.randomUUID();
        when(store.startRun("EXCEL")).thenReturn(run);
        assertThatThrownBy(() -> service.importWorkbook(new byte[0])).isInstanceOf(InvalidProjectWorkbook.class);
        verify(store).failRun(run);
        verify(store, never()).importExcel(any(), any());
    }

    @Test
    void importsAndAuditsValidWorkbook() {
        UUID run = UUID.randomUUID();
        when(store.startRun("EXCEL")).thenReturn(run);
        byte[] bytes = workbook.write(List.of(), true);
        assertThat(service.importWorkbook(bytes)).isEqualTo(1);
        verify(store).importExcel(run, workbook.read(bytes));
        verify(store, never()).failRun(any());
    }
}
