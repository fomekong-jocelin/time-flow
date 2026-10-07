package cm.indyli.timeflow.billing.application;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class BillingExportService {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    public byte[] generateExcel(BillingOverview overview, List<BillingDetailItem> details) {
        try (var book = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            boolean financials = overview.canViewFinancials();
            var header = headerStyle(book);
            var decimal = book.createCellStyle();
            decimal.setDataFormat(book.createDataFormat().getFormat("#,##0.00"));
            List<String> projectHeaders = new ArrayList<>(List.of("Réf", "Projet", "Client / Organisation", "Contributeurs",
                    "Total Heures", "Heures Facturables", "Jours Facturés", "Devise", "Budget Jours", "Reste Jours"));
            if (financials) projectHeaders.addAll(List.of("TJM Projet", "Budget Total HT", "Montant Facturé HT", "Reste Budget HT"));
            var projectSheet = sheet(book, "Synthèse Projets", projectHeaders, header);
            for (var p : overview.projects()) {
                var row = new ArrayList<Object>();
                row.add(p.projectReference()); row.add(p.projectName()); row.add(p.clientOrganization()); row.add(p.contributorsCount());
                row.add(hours(p.totalMinutes())); row.add(hours(p.billableMinutes())); row.add(p.billableDays()); row.add(p.currency());
                row.add(p.budgetDays()); row.add(p.remainingDays());
                if (financials) { row.add(p.dailyRate()); row.add(p.totalPrice()); row.add(p.totalAmount()); row.add(p.remainingAmount()); }
                append(projectSheet, row, decimal);
            }
            List<String> userHeaders = new ArrayList<>(List.of("Collaborateur", "Email", "Rôle", "Régime",
                    "Total Heures", "Heures Facturables", "Jours Facturés", "Heures Supp."));
            if (financials) userHeaders.addAll(List.of("TJM", "Montant Total HT", "Devise TJM", "Devise Montant", "Heures non valorisées"));
            var userSheet = sheet(book, "Synthèse Collaborateurs", userHeaders, header);
            for (var u : overview.users()) {
                var row = new ArrayList<Object>();
                row.add(u.displayName()); row.add(u.email()); row.add(u.role()); row.add(u.workScheduleName());
                row.add(hours(u.totalMinutes())); row.add(hours(u.billableMinutes())); row.add(u.billableDays()); row.add(hours(u.overtimeMinutes()));
                if (financials) {
                    row.add(u.dailyRate()); row.add(u.totalAmount()); row.add(u.dailyRateCurrency());
                    row.add(u.moneyTotals().size() == 1 ? u.moneyTotals().getFirst().currency() : null);
                    row.add(hours(u.moneyTotals().stream().mapToInt(MoneyTotal::unpricedBillableMinutes).sum()));
                }
                append(userSheet, row, decimal);
            }
            List<String> detailHeaders = new ArrayList<>(List.of("Date", "Collaborateur", "Projet", "Activité", "Heures", "Facturable", "Jours Facturés", "Devise"));
            if (financials) detailHeaders.addAll(List.of("Taux Journalier", "Montant HT"));
            detailHeaders.add("Commentaire");
            var detailSheet = sheet(book, "Détail Imputations", detailHeaders, header);
            for (var d : details) {
                var row = new ArrayList<Object>();
                row.add(d.entryDate() == null ? "" : DATE.format(d.entryDate())); row.add(d.userDisplayName()); row.add(d.projectName());
                row.add(d.activityType()); row.add(hours(d.minutes())); row.add(d.billable() ? "OUI" : "NON");
                row.add(d.billableDays()); row.add(MoneyTotals.normalize(d.currency()));
                if (financials) { row.add(d.dailyRate()); row.add(d.totalAmount()); }
                row.add(d.comment()); append(detailSheet, row, decimal);
            }
            if (financials) {
                var moneySheet = sheet(book, "Montants Collaborateurs",
                        List.of("Collaborateur", "Devise", "Montant HT valorisé", "Heures non valorisées"), header);
                for (var user : overview.users()) for (var money : user.moneyTotals()) {
                    append(moneySheet, List.of(user.displayName(), money.currency(), money.amount(), hours(money.unpricedBillableMinutes())), decimal);
                }
                var totalSheet = sheet(book, "Totaux par devise", List.of("Devise", "Montant HT valorisé", "Heures non valorisées"), header);
                for (var money : overview.moneyTotals()) append(totalSheet,
                        List.of(money.currency(), money.amount(), hours(money.unpricedBillableMinutes())), decimal);
            }
            for (var sheet : book) {
                int columns = sheet.getRow(0).getLastCellNum();
                sheet.setAutoFilter(new CellRangeAddress(0, sheet.getLastRowNum(), 0, columns - 1));
                for (int c = 0; c < columns; c++) {
                    sheet.autoSizeColumn(c);
                    sheet.setColumnWidth(c, Math.min(16000, Math.max(3000, sheet.getColumnWidth(c) + 768)));
                }
            }
            book.write(out); return out.toByteArray();
        } catch (IOException ex) { throw new IllegalStateException("Erreur lors de la génération du fichier Excel de facturation", ex); }
    }
    public byte[] generateCsv(BillingOverview overview, List<BillingDetailItem> details) {
        var csv = new StringBuilder("\uFEFFDate;Collaborateur;Projet;Activité;Heures;Facturable;Jours facturés;Devise");
        if (overview.canViewFinancials()) csv.append(";TJM;Montant HT");
        csv.append(";Commentaire\n");
        for (var d : details) {
            csv.append(d.entryDate() == null ? "" : DATE.format(d.entryDate())).append(';')
                    .append(CsvCell.text(d.userDisplayName())).append(';').append(CsvCell.text(d.projectName())).append(';')
                    .append(CsvCell.text(d.activityType())).append(';').append(number(d.minutes() / 60.0)).append(';')
                    .append(d.billable() ? "OUI" : "NON").append(';').append(number(d.billableDays())).append(';')
                    .append(CsvCell.text(MoneyTotals.normalize(d.currency())));
            if (overview.canViewFinancials()) csv.append(';').append(number(d.dailyRate())).append(';').append(number(d.totalAmount()));
            csv.append(';').append(CsvCell.text(d.comment())).append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
    private static double hours(int minutes) { return Math.round(minutes / 60.0 * 100) / 100.0; }
    private static String number(Number value) {
        if (value == null) return "";
        if (value instanceof BigDecimal decimal) return String.format(Locale.FRENCH, "%.2f", decimal);
        return String.format(Locale.FRENCH, "%.2f", value.doubleValue());
    }
    private static Sheet sheet(XSSFWorkbook book, String name, List<String> headers, CellStyle style) {
        var sheet = book.createSheet(name); var row = sheet.createRow(0); row.setHeightInPoints(26);
        for (int i = 0; i < headers.size(); i++) { var cell = row.createCell(i, CellType.STRING); cell.setCellValue(headers.get(i)); cell.setCellStyle(style); }
        sheet.createFreezePane(0, 1); return sheet;
    }
    private static void append(Sheet sheet, List<?> values, CellStyle decimal) {
        var row = sheet.createRow(sheet.getLastRowNum() + 1);
        for (int i = 0; i < values.size(); i++) {
            Object value = values.get(i); var cell = row.createCell(i);
            if (value instanceof Number number) { cell.setCellValue(number.doubleValue()); cell.setCellStyle(decimal); }
            else if (value != null) { cell.setCellValue(value.toString()); }
        }
    }
    private static CellStyle headerStyle(XSSFWorkbook book) {
        var font = book.createFont(); font.setBold(true); font.setColor(IndexedColors.WHITE.getIndex());
        var style = book.createCellStyle(); style.setFont(font); style.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND); return style;
    }
}
