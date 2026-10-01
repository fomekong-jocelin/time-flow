package cm.indyli.timeflow.billing.application;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class BillingExportServiceTest {

    private final BillingExportService exportService = new BillingExportService();

    @Test
    void exportExcel_whenManager_shouldOmitFinancialColumnsFromAllSheets() throws Exception {
        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                2100, 2100, 5.0,
                1, 1,
                false, // canViewFinancials = false
                null,
                List.of(new ProjectBillingItem(
                        UUID.randomUUID(), "Projet Alpha", "PRJ-01", "Client A",
                        2100, 2100, 5.0, null, null, 1
                )),
                List.of(new UserBillingItem(
                        UUID.randomUUID(), "Jean Dupont", "jean@example.com", "COLLABORATOR", "Standard 35h",
                        2100, 2100, 5.0, 0, null, null
                ))
        );

        var details = List.of(new BillingDetailItem(
                LocalDate.of(2026, 10, 5),
                UUID.randomUUID(), "Jean Dupont",
                UUID.randomUUID(), "Projet Alpha",
                "PROJET", 420, true, 1.0, null, null, "Développement feature"
        ));

        byte[] bytes = exportService.generateExcel(overview, details);

        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var sheet1 = workbook.getSheet("Synthèse Projets");
            assertThat(sheet1).isNotNull();
            var row0 = sheet1.getRow(0);
            for (int i = 0; i < row0.getLastCellNum(); i++) {
                String header = row0.getCell(i).getStringCellValue();
                assertThat(header).doesNotContainIgnoringCase("TJM");
                assertThat(header).doesNotContainIgnoringCase("Montant");
                assertThat(header).doesNotContainIgnoringCase("Taux");
            }
            assertThat(row0.getLastCellNum()).isEqualTo((short) 7);

            var sheet2 = workbook.getSheet("Synthèse Collaborateurs");
            assertThat(sheet2).isNotNull();
            var row2 = sheet2.getRow(0);
            for (int i = 0; i < row2.getLastCellNum(); i++) {
                String header = row2.getCell(i).getStringCellValue();
                assertThat(header).doesNotContainIgnoringCase("TJM");
                assertThat(header).doesNotContainIgnoringCase("Montant");
            }
            assertThat(row2.getLastCellNum()).isEqualTo((short) 8);

            var sheet3 = workbook.getSheet("Détail Imputations");
            assertThat(sheet3).isNotNull();
            var row3 = sheet3.getRow(0);
            for (int i = 0; i < row3.getLastCellNum(); i++) {
                String header = row3.getCell(i).getStringCellValue();
                assertThat(header).doesNotContainIgnoringCase("TJM");
                assertThat(header).doesNotContainIgnoringCase("Montant");
                assertThat(header).doesNotContainIgnoringCase("Taux");
            }
            assertThat(row3.getLastCellNum()).isEqualTo((short) 8);
        }
    }

    @Test
    void exportExcel_whenDirection_shouldIncludeFinancialColumnsAndValues() throws Exception {
        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                2100, 2100, 5.0,
                1, 1,
                true, // canViewFinancials = true
                BigDecimal.valueOf(2500.00),
                List.of(new ProjectBillingItem(
                        UUID.randomUUID(), "Projet Alpha", "PRJ-01", "Client A",
                        2100, 2100, 5.0, BigDecimal.valueOf(500.00), BigDecimal.valueOf(2500.00), 1
                )),
                List.of(new UserBillingItem(
                        UUID.randomUUID(), "Jean Dupont", "jean@example.com", "COLLABORATOR", "Standard 35h",
                        2100, 2100, 5.0, 0, BigDecimal.valueOf(500.00), BigDecimal.valueOf(2500.00)
                ))
        );

        var details = List.of(new BillingDetailItem(
                LocalDate.of(2026, 10, 5),
                UUID.randomUUID(), "Jean Dupont",
                UUID.randomUUID(), "Projet Alpha",
                "PROJET", 420, true, 1.0, BigDecimal.valueOf(500.00), BigDecimal.valueOf(500.00), "Développement feature"
        ));

        byte[] bytes = exportService.generateExcel(overview, details);

        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var sheet1 = workbook.getSheet("Synthèse Projets");
            var row0 = sheet1.getRow(0);
            assertThat(row0.getCell(7).getStringCellValue()).isEqualTo("TJM Projet (€)");
            assertThat(row0.getCell(8).getStringCellValue()).isEqualTo("Montant Total HT (€)");

            var dataRow1 = sheet1.getRow(1);
            assertThat(dataRow1.getCell(7).getNumericCellValue()).isEqualTo(500.0);
            assertThat(dataRow1.getCell(8).getNumericCellValue()).isEqualTo(2500.0);

            var sheet2 = workbook.getSheet("Synthèse Collaborateurs");
            var row2 = sheet2.getRow(0);
            assertThat(row2.getCell(8).getStringCellValue()).isEqualTo("TJM (€)");
            assertThat(row2.getCell(9).getStringCellValue()).isEqualTo("Montant Total HT (€)");

            var sheet3 = workbook.getSheet("Détail Imputations");
            var row3 = sheet3.getRow(0);
            assertThat(row3.getCell(7).getStringCellValue()).isEqualTo("Taux Journalier (€)");
            assertThat(row3.getCell(8).getStringCellValue()).isEqualTo("Montant HT (€)");
        }
    }

    @Test
    void exportCsv_whenManager_shouldOmitFinancialColumns() {
        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                420, 420, 1.0, 1, 1, false, null, List.of(), List.of()
        );
        var details = List.of(new BillingDetailItem(
                LocalDate.of(2026, 10, 5),
                UUID.randomUUID(), "Jean Dupont",
                UUID.randomUUID(), "Projet Alpha",
                "PROJET", 420, true, 1.0, null, null, "Commentaire test"
        ));

        byte[] csvBytes = exportService.generateCsv(overview, details);
        String csv = new String(csvBytes, StandardCharsets.UTF_8);

        assertThat(csv).doesNotContain("TJM");
        assertThat(csv).doesNotContain("Montant HT");
        assertThat(csv).contains("05/10/2026;Jean Dupont;Projet Alpha;PROJET;7,00;OUI;1,00;Commentaire test");
    }

    @Test
    void exportCsv_whenDirection_shouldIncludeFinancialColumns() {
        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                420, 420, 1.0, 1, 1, true, BigDecimal.valueOf(600.00), List.of(), List.of()
        );
        var details = List.of(new BillingDetailItem(
                LocalDate.of(2026, 10, 5),
                UUID.randomUUID(), "Jean Dupont",
                UUID.randomUUID(), "Projet Alpha",
                "PROJET", 420, true, 1.0, BigDecimal.valueOf(600.00), BigDecimal.valueOf(600.00), "Commentaire test"
        ));

        byte[] csvBytes = exportService.generateCsv(overview, details);
        String csv = new String(csvBytes, StandardCharsets.UTF_8);

        assertThat(csv).contains("TJM (€);Montant HT (€)");
        assertThat(csv).contains("600,00;600,00");
    }
}
