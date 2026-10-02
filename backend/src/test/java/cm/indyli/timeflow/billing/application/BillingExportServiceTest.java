package cm.indyli.timeflow.billing.application;

import org.apache.poi.ss.usermodel.CellType;
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
    private final BillingExportService service = new BillingExportService();
    private final UUID user = UUID.randomUUID(), project = UUID.randomUUID();
    private BillingOverview overview(boolean financials, String currency) {
        var amount = financials ? new BigDecimal("2500") : null;
        var rate = financials ? new BigDecimal("500") : null;
        return new BillingOverview("2026-10", "Octobre 2026", LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                2100, 2100, 5, 1, 1, financials, amount,
                List.of(new ProjectBillingItem(project, "Projet Alpha", "PRJ-01", "Client A", 2100, 2100, 5, rate, amount, 1, currency, null, null, null, null, null, null)),
                List.of(new UserBillingItem(user, "Jean Dupont", "jean@example.com", "COLLABORATOR", "Standard 35h", 2100, 2100, 5, 0,
                        rate, amount, "EUR", financials ? List.of(new MoneyTotal(currency, amount, 0)) : List.of())));
    }
    private BillingDetailItem detail(boolean financials, String currency, String comment) {
        return new BillingDetailItem(LocalDate.of(2026, 10, 5), user, "Jean Dupont", project, "Projet Alpha", "PROJET", 420, true, 1,
                financials ? new BigDecimal("600") : null, financials ? new BigDecimal("600") : null, comment, currency);
    }
    @Test void exportExcel_whenManager_shouldOmitFinancialColumnsFromAllSheets() throws Exception {
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateExcel(overview(false, "EUR"), List.of(detail(false, "EUR", "Commentaire")))))) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(3);
            String[] names = {"Synthèse Projets", "Synthèse Collaborateurs", "Détail Imputations"};
            int[] columns = {10, 8, 9};
            for (int i = 0; i < names.length; i++) {
                var sheet = workbook.getSheet(names[i]); assertThat(sheet).isNotNull();
                var row = sheet.getRow(0); assertThat(row.getLastCellNum()).isEqualTo((short) columns[i]);
                for (var cell : row) {
                    String header = cell.getStringCellValue();
                    assertThat(header).doesNotContainIgnoringCase("TJM").doesNotContainIgnoringCase("Montant").doesNotContainIgnoringCase("Taux");
                }
            }
        }
    }
    @Test void exportExcel_whenDirection_shouldIncludeFinancialColumnsAndValues() throws Exception {
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateExcel(overview(true, "EUR"), List.of(detail(true, "EUR", "Commentaire")))))) {
            var projects = workbook.getSheet("Synthèse Projets");
            assertThat(projects.getRow(0).getCell(10).getStringCellValue()).isEqualTo("TJM Projet");
            assertThat(projects.getRow(0).getCell(12).getStringCellValue()).isEqualTo("Montant Facturé HT");
            assertThat(projects.getRow(1).getCell(10).getNumericCellValue()).isEqualTo(500);
            assertThat(projects.getRow(1).getCell(12).getNumericCellValue()).isEqualTo(2500);
            var users = workbook.getSheet("Synthèse Collaborateurs");
            assertThat(users.getRow(0).getCell(8).getStringCellValue()).isEqualTo("TJM");
            assertThat(users.getRow(0).getCell(9).getStringCellValue()).isEqualTo("Montant Total HT");
            assertThat(users.getRow(1).getCell(10).getStringCellValue()).isEqualTo("EUR");
            var details = workbook.getSheet("Détail Imputations");
            assertThat(details.getRow(0).getCell(8).getStringCellValue()).isEqualTo("Taux Journalier");
            assertThat(details.getRow(0).getCell(9).getStringCellValue()).isEqualTo("Montant HT");
        }
    }
    @Test void exportCsv_whenManager_shouldOmitFinancialColumns() {
        String csv = new String(service.generateCsv(overview(false, "EUR"), List.of(detail(false, "EUR", "Commentaire test"))), StandardCharsets.UTF_8);
        assertThat(csv).doesNotContain("TJM").doesNotContain("Montant HT");
        assertThat(csv).contains("05/10/2026;Jean Dupont;Projet Alpha;PROJET;7,00;OUI;1,00;EUR;Commentaire test");
    }
    @Test void exportCsv_whenDirection_shouldIncludeFinancialColumns() {
        String csv = new String(service.generateCsv(overview(true, "EUR"), List.of(detail(true, "EUR", "Commentaire test"))), StandardCharsets.UTF_8);
        assertThat(csv).contains("TJM;Montant HT").contains("600,00;600,00");
    }
    @Test void xlsxUsesActualCurrencyAndNeverTurnsTextIntoAFormula() throws Exception {
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateExcel(overview(true, "USD"), List.of(detail(true, "USD", "=1+1")))))) {
            var projects = workbook.getSheet("Synthèse Projets");
            assertThat(projects.getRow(1).getCell(7).getStringCellValue()).isEqualTo("USD");
            assertThat(projects.getRow(1).getCell(12).getCellStyle().getDataFormatString()).doesNotContain("€").doesNotContain("EUR");
            var details = workbook.getSheet("Détail Imputations");
            assertThat(details.getRow(1).getCell(10).getCellType()).isEqualTo(CellType.STRING);
            assertThat(details.getRow(1).getCell(10).getStringCellValue()).isEqualTo("=1+1");
            assertThat(workbook.getSheet("Totaux par devise").getRow(1).getCell(0).getStringCellValue()).isEqualTo("USD");
        }
    }
    @Test void csvNeutralizesFormulaPrefixesIncludingCurrencyAndComments() {
        String csv = new String(service.generateCsv(overview(true, "EUR"), List.of(detail(true, "=1+1", "\t=1+1"))), StandardCharsets.UTF_8);
        assertThat(csv).contains("\"'=1+1\"").contains("\"'\t=1+1\"");
    }
    @Test void unknownAmountIsBlankRatherThanZeroInExcelAndCsv() throws Exception {
        var unknown = new BillingDetailItem(LocalDate.of(2026, 10, 5), user, "Jean Dupont", project, "Projet Alpha", "PROJET", 420, true, 1, null, null, "Unknown", "USD");
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(service.generateExcel(overview(true, "USD"), List.of(unknown))))) {
            assertThat(workbook.getSheet("Détail Imputations").getRow(1).getCell(9).getCellType()).isEqualTo(CellType.BLANK);
        }
        assertThat(new String(service.generateCsv(overview(true, "USD"), List.of(unknown)), StandardCharsets.UTF_8)).contains("USD;;;Unknown");
    }
}
