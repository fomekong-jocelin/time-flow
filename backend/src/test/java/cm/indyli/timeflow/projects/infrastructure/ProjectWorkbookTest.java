package cm.indyli.timeflow.projects.infrastructure;

import cm.indyli.timeflow.projects.application.InvalidProjectWorkbook;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ProjectWorkbookTest {
    private final ProjectWorkbook codec = new ProjectWorkbook();

    @Test
    void templateCanBeImportedImmediately() {
        var projects = codec.read(codec.write(List.of(), true));
        assertThat(projects).hasSize(1);
        assertThat(projects.getFirst().reference()).isEqualTo("DEMO-001");
        assertThat(projects.getFirst().active()).isTrue();
    }

    @Test
    void roundTripPreservesExcelReferencesAndKeepsAzureOutsideImport() throws Exception {
        var local = new ProjectStore.ProjectView(UUID.randomUUID(), "=Une mission", "EXCEL", "LOCAL", false, false, "001");
        var azure = new ProjectStore.ProjectView(UUID.randomUUID(), "Mission Azure", "AZURE_DEVOPS", "example", true, true, UUID.randomUUID().toString());
        byte[] bytes = codec.write(List.of(local, azure), false);
        var imported = codec.read(bytes);
        assertThat(imported).hasSize(1);
        assertThat(imported.getFirst().reference()).isEqualTo("001");
        assertThat(imported.getFirst().name()).isEqualTo("=Une mission");
        assertThat(imported.getFirst().active()).isFalse();
        assertThat(imported.getFirst().billable()).isFalse();
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertThat(workbook.getSheet("Projets").getRow(1).getCell(1).getCellType()).isEqualTo(CellType.STRING);
            assertThat(workbook.getSheet("Autres sources").getLastRowNum()).isEqualTo(1);
        }
    }

    @Test
    void rejectsDuplicateReferencesWithLineNumber() throws Exception {
        var bytes = modified(workbook -> {
            var sheet = workbook.getSheet("Projets");
            var row = sheet.createRow(2);
            for (int i = 0; i < 4; i++) row.createCell(i).setCellValue(sheet.getRow(1).getCell(i).getStringCellValue());
        });
        assertThatThrownBy(() -> codec.read(bytes)).isInstanceOf(InvalidProjectWorkbook.class).hasMessageContaining("Ligne 3");
    }

    @Test
    void rejectsFormulasAndInvalidBooleansBeforeAnyImport() throws Exception {
        var formula = modified(workbook -> workbook.getSheet("Projets").getRow(1).getCell(1).setCellFormula("1+1"));
        assertThatThrownBy(() -> codec.read(formula)).hasMessageContaining("sans formule");
        var invalidBoolean = modified(workbook -> workbook.getSheet("Projets").getRow(1).getCell(2).setCellValue("peut-être"));
        assertThatThrownBy(() -> codec.read(invalidBoolean)).hasMessageContaining("OUI ou NON");
    }

    @Test
    void rejectsMissingHeadersOversizedAndNonExcelFiles() throws Exception {
        var invalidHeader = modified(workbook -> workbook.getSheet("Projets").getRow(0).getCell(0).setCellValue("Projet"));
        assertThatThrownBy(() -> codec.read(invalidHeader)).hasMessageContaining("En-têtes");
        assertThatThrownBy(() -> codec.read(new byte[ProjectWorkbook.MAX_BYTES + 1])).hasMessageContaining("1 Mo");
        assertThatThrownBy(() -> codec.read("not an excel file".getBytes())).isInstanceOf(InvalidProjectWorkbook.class);
    }

    private byte[] modified(Consumer<XSSFWorkbook> change) throws Exception {
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(codec.write(List.of(), true)));
             var output = new ByteArrayOutputStream()) {
            change.accept(workbook);
            workbook.write(output);
            return output.toByteArray();
        }
    }
}
