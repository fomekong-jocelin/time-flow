package cm.indyli.timeflow.projects.api;

import cm.indyli.timeflow.projects.application.InvalidProjectWorkbook;
import cm.indyli.timeflow.projects.application.ProjectExcelService;
import cm.indyli.timeflow.projects.infrastructure.ProjectWorkbook;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/projects/excel")
public class ProjectExcelController {
    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private final ProjectExcelService service;

    public ProjectExcelController(ProjectExcelService service) { this.service = service; }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() { return download("modele-projets-timeflow.xlsx", service.template()); }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export() { return download("projets-timeflow.xlsx", service.exportWorkbook()); }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportResult upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > ProjectWorkbook.MAX_BYTES) {
            throw new InvalidProjectWorkbook("Fichier vide ou supérieur à 1 Mo.");
        }
        return new ImportResult(service.importWorkbook(file.getBytes()));
    }

    private ResponseEntity<byte[]> download(String filename, byte[] bytes) {
        return ResponseEntity.ok().contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store").body(bytes);
    }

    public record ImportResult(int importedCount) { }
}
