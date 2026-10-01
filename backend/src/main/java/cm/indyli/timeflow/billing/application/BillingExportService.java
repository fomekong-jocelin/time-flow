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

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generateExcel(BillingOverview overview, List<BillingDetailItem> details) {
        try (var workbook = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            boolean financials = overview.canViewFinancials();

            // Cell Styles
            var headerStyle = createHeaderStyle(workbook);
            var decimalStyle = workbook.createCellStyle();
            decimalStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));

            var currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00 €"));

            var integerStyle = workbook.createCellStyle();
            integerStyle.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));

            // --- Sheet 1: Synthèse Projets ---
            List<String> projectHeaders = new ArrayList<>(List.of(
                    "Réf", "Projet", "Client / Organisation", "Contributeurs",
                    "Total Heures", "Heures Facturables", "Jours Facturés", "Devise", "Budget Jours", "Reste Jours"
            ));
            if (financials) {
                projectHeaders.add("TJM Projet");
                projectHeaders.add("Budget Total HT");
                projectHeaders.add("Montant Facturé HT");
                projectHeaders.add("Reste Budget HT");
            }
            var sheet1 = createStyledSheet(workbook, "Synthèse Projets", projectHeaders, headerStyle);

            int rowIdx = 1;
            for (var p : overview.projects()) {
                var row = sheet1.createRow(rowIdx++);
                int col = 0;
                row.createCell(col++, CellType.STRING).setCellValue(p.projectReference() != null ? p.projectReference() : "-");
                row.createCell(col++, CellType.STRING).setCellValue(p.projectName());
                row.createCell(col++, CellType.STRING).setCellValue(p.clientOrganization() != null ? p.clientOrganization() : "-");

                var cContrib = row.createCell(col++, CellType.NUMERIC);
                cContrib.setCellValue(p.contributorsCount());
                cContrib.setCellStyle(integerStyle);

                var cTotalH = row.createCell(col++, CellType.NUMERIC);
                cTotalH.setCellValue(roundTwoDecimals(p.totalMinutes() / 60.0));
                cTotalH.setCellStyle(decimalStyle);

                var cBillH = row.createCell(col++, CellType.NUMERIC);
                cBillH.setCellValue(roundTwoDecimals(p.billableMinutes() / 60.0));
                cBillH.setCellStyle(decimalStyle);

                var cBillD = row.createCell(col++, CellType.NUMERIC);
                cBillD.setCellValue(p.billableDays());
                cBillD.setCellStyle(decimalStyle);

                row.createCell(col++, CellType.STRING).setCellValue(p.currency() != null ? p.currency() : "EUR");

                var cBudgetD = row.createCell(col++, CellType.NUMERIC);
                cBudgetD.setCellValue(p.budgetDays() != null ? p.budgetDays().doubleValue() : 0.0);
                cBudgetD.setCellStyle(decimalStyle);

                var cRemainD = row.createCell(col++, CellType.NUMERIC);
                cRemainD.setCellValue(p.remainingDays() != null ? p.remainingDays() : 0.0);
                cRemainD.setCellStyle(decimalStyle);

                if (financials) {
                    var cRate = row.createCell(col++, CellType.NUMERIC);
                    cRate.setCellValue(p.dailyRate() != null ? p.dailyRate().doubleValue() : 0.0);
                    cRate.setCellStyle(currencyStyle);

                    var cBudgetAmount = row.createCell(col++, CellType.NUMERIC);
                    cBudgetAmount.setCellValue(p.totalPrice() != null ? p.totalPrice().doubleValue() : 0.0);
                    cBudgetAmount.setCellStyle(currencyStyle);

                    var cAmount = row.createCell(col++, CellType.NUMERIC);
                    cAmount.setCellValue(p.totalAmount() != null ? p.totalAmount().doubleValue() : 0.0);
                    cAmount.setCellStyle(currencyStyle);

                    var cRemainAmount = row.createCell(col++, CellType.NUMERIC);
                    cRemainAmount.setCellValue(p.remainingAmount() != null ? p.remainingAmount().doubleValue() : 0.0);
                    cRemainAmount.setCellStyle(currencyStyle);
                }
            }
            autoSizeColumns(sheet1, projectHeaders.size());

            // --- Sheet 2: Synthèse Collaborateurs ---
            List<String> userHeaders = new ArrayList<>(List.of(
                    "Collaborateur", "Email", "Rôle", "Régime",
                    "Total Heures", "Heures Facturables", "Jours Facturés", "Heures Supp."
            ));
            if (financials) {
                userHeaders.add("TJM (€)");
                userHeaders.add("Montant Total HT (€)");
            }
            var sheet2 = createStyledSheet(workbook, "Synthèse Collaborateurs", userHeaders, headerStyle);

            rowIdx = 1;
            for (var u : overview.users()) {
                var row = sheet2.createRow(rowIdx++);
                int col = 0;
                row.createCell(col++, CellType.STRING).setCellValue(u.displayName());
                row.createCell(col++, CellType.STRING).setCellValue(u.email());
                row.createCell(col++, CellType.STRING).setCellValue(u.role());
                row.createCell(col++, CellType.STRING).setCellValue(u.workScheduleName());

                var cTotalH = row.createCell(col++, CellType.NUMERIC);
                cTotalH.setCellValue(roundTwoDecimals(u.totalMinutes() / 60.0));
                cTotalH.setCellStyle(decimalStyle);

                var cBillH = row.createCell(col++, CellType.NUMERIC);
                cBillH.setCellValue(roundTwoDecimals(u.billableMinutes() / 60.0));
                cBillH.setCellStyle(decimalStyle);

                var cBillD = row.createCell(col++, CellType.NUMERIC);
                cBillD.setCellValue(u.billableDays());
                cBillD.setCellStyle(decimalStyle);

                var cOtH = row.createCell(col++, CellType.NUMERIC);
                cOtH.setCellValue(roundTwoDecimals(u.overtimeMinutes() / 60.0));
                cOtH.setCellStyle(decimalStyle);

                if (financials) {
                    var cRate = row.createCell(col++, CellType.NUMERIC);
                    if (u.dailyRate() != null) {
                        cRate.setCellValue(u.dailyRate().doubleValue());
                        cRate.setCellStyle(currencyStyle);
                    } else {
                        cRate.setCellValue(0.0);
                    }

                    var cAmount = row.createCell(col++, CellType.NUMERIC);
                    if (u.totalAmount() != null) {
                        cAmount.setCellValue(u.totalAmount().doubleValue());
                        cAmount.setCellStyle(currencyStyle);
                    } else {
                        cAmount.setCellValue(0.0);
                    }
                }
            }
            autoSizeColumns(sheet2, userHeaders.size());

            // --- Sheet 3: Détail des Imputations ---
            List<String> detailHeaders = new ArrayList<>(List.of(
                    "Date", "Collaborateur", "Projet", "Activité",
                    "Heures", "Facturable", "Jours Facturés", "Devise"
            ));
            if (financials) {
                detailHeaders.add("Taux Journalier");
                detailHeaders.add("Montant HT");
            }
            detailHeaders.add("Commentaire");

            var sheet3 = createStyledSheet(workbook, "Détail Imputations", detailHeaders, headerStyle);

            rowIdx = 1;
            for (var d : details) {
                var row = sheet3.createRow(rowIdx++);
                int col = 0;
                row.createCell(col++, CellType.STRING).setCellValue(d.entryDate() != null ? d.entryDate().format(DATE_FMT) : "");
                row.createCell(col++, CellType.STRING).setCellValue(d.userDisplayName());
                row.createCell(col++, CellType.STRING).setCellValue(d.projectName());
                row.createCell(col++, CellType.STRING).setCellValue(d.activityType() != null ? d.activityType() : "");

                var cH = row.createCell(col++, CellType.NUMERIC);
                cH.setCellValue(roundTwoDecimals(d.minutes() / 60.0));
                cH.setCellStyle(decimalStyle);

                row.createCell(col++, CellType.STRING).setCellValue(d.billable() ? "OUI" : "NON");

                var cBillD = row.createCell(col++, CellType.NUMERIC);
                cBillD.setCellValue(d.billableDays());
                cBillD.setCellStyle(decimalStyle);

                row.createCell(col++, CellType.STRING).setCellValue(d.currency() != null ? d.currency() : "EUR");

                if (financials) {
                    var cRate = row.createCell(col++, CellType.NUMERIC);
                    if (d.dailyRate() != null) {
                        cRate.setCellValue(d.dailyRate().doubleValue());
                        cRate.setCellStyle(currencyStyle);
                    } else {
                        cRate.setCellValue(0.0);
                    }

                    var cAmount = row.createCell(col++, CellType.NUMERIC);
                    if (d.totalAmount() != null) {
                        cAmount.setCellValue(d.totalAmount().doubleValue());
                        cAmount.setCellStyle(currencyStyle);
                    } else {
                        cAmount.setCellValue(0.0);
                    }
                }

                row.createCell(col++, CellType.STRING).setCellValue(d.comment() != null ? d.comment() : "");
            }
            autoSizeColumns(sheet3, detailHeaders.size());

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Erreur lors de la génération du fichier Excel de facturation", e);
        }
    }

    public byte[] generateCsv(BillingOverview overview, List<BillingDetailItem> details) {
        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        sb.append('\uFEFF');

        boolean financials = overview.canViewFinancials();

        // CSV Header
        sb.append("Date;Collaborateur;Projet;Activité;Heures;Facturable;Jours facturés;Devise");
        if (financials) {
            sb.append(";TJM;Montant HT");
        }
        sb.append(";Commentaire\n");

        for (var d : details) {
            sb.append(d.entryDate() != null ? d.entryDate().format(DATE_FMT) : "").append(';');
            sb.append(escapeCsv(d.userDisplayName())).append(';');
            sb.append(escapeCsv(d.projectName())).append(';');
            sb.append(escapeCsv(d.activityType() != null ? d.activityType() : "")).append(';');
            sb.append(String.format(Locale.FRENCH, "%.2f", d.minutes() / 60.0)).append(';');
            sb.append(d.billable() ? "OUI" : "NON").append(';');
            sb.append(String.format(Locale.FRENCH, "%.2f", d.billableDays())).append(';');
            sb.append(d.currency() != null ? d.currency() : "EUR");

            if (financials) {
                sb.append(';');
                sb.append(d.dailyRate() != null ? String.format(Locale.FRENCH, "%.2f", d.dailyRate()) : "0,00");
                sb.append(';');
                sb.append(d.totalAmount() != null ? String.format(Locale.FRENCH, "%.2f", d.totalAmount()) : "0,00");
            }

            sb.append(';');
            sb.append(escapeCsv(d.comment() != null ? d.comment() : "")).append('\n');
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Sheet createStyledSheet(XSSFWorkbook workbook, String name, List<String> headers, CellStyle headerStyle) {
        var sheet = workbook.createSheet(name);
        var row = sheet.createRow(0);
        row.setHeightInPoints(26);
        for (int i = 0; i < headers.size(); i++) {
            var cell = row.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(headerStyle);
        }
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.size() - 1));
        return sheet;
    }

    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        var font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 11);

        var style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private void autoSizeColumns(Sheet sheet, int colCount) {
        for (int i = 0; i < colCount; i++) {
            sheet.autoSizeColumn(i);
            int currentWidth = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.max(currentWidth + 1024, 3000));
        }
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(";") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
