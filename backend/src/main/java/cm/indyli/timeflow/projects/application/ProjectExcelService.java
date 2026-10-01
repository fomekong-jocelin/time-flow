package cm.indyli.timeflow.projects.application;

import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.projects.infrastructure.ProjectWorkbook;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
public class ProjectExcelService {
    private final ProjectStore store;
    private final ProjectWorkbook workbook;

    public ProjectExcelService(ProjectStore store, ProjectWorkbook workbook) {
        this.store = store;
        this.workbook = workbook;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public int importWorkbook(byte[] bytes) {
        var runId = store.startRun("EXCEL");
        try {
            var projects = workbook.read(bytes);
            store.importExcel(runId, projects);
            return projects.size();
        } catch (RuntimeException exception) {
            store.failRun(runId);
            throw exception;
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    public byte[] exportWorkbook() { return workbook.write(store.list(), false); }

    @PreAuthorize("hasRole('ADMIN')")
    public byte[] template() { return workbook.write(List.of(), true); }
}
