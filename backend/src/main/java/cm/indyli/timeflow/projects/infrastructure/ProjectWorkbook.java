package cm.indyli.timeflow.projects.infrastructure;

import cm.indyli.timeflow.projects.application.InvalidProjectWorkbook;
import cm.indyli.timeflow.projects.domain.ExcelProject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.zip.ZipInputStream;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

@Component
public class ProjectWorkbook {
    public static final int MAX_BYTES = 1024 * 1024;
    private static final int MAX_ROWS = 5000;
    public static final List<String> BASE_HEADERS = List.of("Référence", "Nom", "Actif", "Facturable");
    public static final List<String> EXTENDED_HEADERS = List.of("Référence", "Nom", "Actif", "Facturable", "TJM", "Jours budget", "Budget total", "Devise");

    public List<ExcelProject> read(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw invalid("Fichier vide ou supérieur à 1 Mo.");
        checkArchive(bytes);
        try (var workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            var sheet = workbook.getSheet("Projets");
            if (sheet == null || sheet.getRow(0) == null) throw invalid("Onglet Projets et en-têtes obligatoires. Utilisez le modèle.");
            if (sheet.getLastRowNum() > MAX_ROWS) throw invalid("Maximum 5 000 lignes de projets.");
            int numCols = sheet.getRow(0).getLastCellNum();
            if (numCols != 4 && numCols != 8) throw invalid("Quatre ou huit colonnes attendues. Utilisez le modèle.");
            for (int column = 0; column < 4; column++) {
                if (!BASE_HEADERS.get(column).equals(text(sheet.getRow(0).getCell(column)))) throw invalid("En-têtes invalides. Utilisez le modèle.");
            }
            if (numCols == 8) {
                for (int column = 4; column < 8; column++) {
                    if (!EXTENDED_HEADERS.get(column).equals(text(sheet.getRow(0).getCell(column)))) throw invalid("En-têtes invalides. Utilisez le modèle.");
                }
            }
            var projects = new ArrayList<ExcelProject>();
            var references = new HashSet<String>();
            for (int index = 1; index <= sheet.getLastRowNum(); index++) {
                var row = sheet.getRow(index);
                if (row == null) continue;
                try {
                    if (row.getLastCellNum() > numCols) throw invalid("Colonnes supplémentaires non autorisées.");
                    String reference = text(row.getCell(0));
                    String name = text(row.getCell(1));
                    String active = text(row.getCell(2));
                    String billable = text(row.getCell(3));
                    if ((reference + name + active + billable).isBlank()) continue;

                    BigDecimal dailyRate = null;
                    BigDecimal budgetDays = null;
                    BigDecimal totalPrice = null;
                    String currency = "EUR";
                    if (numCols == 8) {
                        dailyRate = parseDecimal(text(row.getCell(4)));
                        budgetDays = parseDecimal(text(row.getCell(5)));
                        totalPrice = parseDecimal(text(row.getCell(6)));
                        String c = text(row.getCell(7));
                        if (!c.isBlank()) currency = c;
                    }

                    var project = new ExcelProject(reference, name, bool(active), bool(billable), dailyRate, budgetDays, totalPrice, currency);
                    if (!references.add(reference)) throw invalid("Référence présente plusieurs fois dans le fichier.");
                    projects.add(project);
                } catch (IllegalArgumentException | InvalidProjectWorkbook exception) {
                    throw invalid("Ligne " + (index + 1) + " : " + exception.getMessage());
                }
            }
            if (projects.isEmpty()) throw invalid("Aucun projet à importer dans l'onglet Projets.");
            return List.copyOf(projects);
        } catch (InvalidProjectWorkbook exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw invalid("Classeur .xlsx invalide ou non pris en charge.");
        }
    }

    private String text(Cell cell) {
        if (cell == null || cell.getCellType() == CellType.BLANK) return "";
        if (cell.getCellType() != CellType.STRING) throw invalid("Les cellules doivent contenir du texte, sans formule.");
        return cell.getStringCellValue().trim();
    }

    private BigDecimal parseDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return new BigDecimal(s.trim().replace(',', '.'));
        } catch (NumberFormatException e) {
            throw invalid("Nombre décimal invalide : " + s);
        }
    }

    private boolean bool(String value) {
        if ("OUI".equalsIgnoreCase(value)) return true;
        if ("NON".equalsIgnoreCase(value)) return false;
        throw invalid("Actif et Facturable doivent valoir OUI ou NON.");
    }

    private void checkArchive(byte[] bytes) {
        try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            long total = 0;
            int entries = 0;
            var buffer = new byte[8192];
            java.util.zip.ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName().toLowerCase(java.util.Locale.ROOT);
                if (++entries > 1000 || name.contains("vbaproject") || name.contains("externallinks/")) {
                    throw invalid("Macros, liens externes ou archive trop complexe non autorisés.");
                }
                int count;
                while ((count = zip.read(buffer)) != -1) {
                    total += count;
                    if (total > 20L * 1024 * 1024) throw invalid("Classeur décompressé trop volumineux.");
                }
            }
            if (entries == 0) throw invalid("Seuls les fichiers .xlsx sont acceptés.");
        } catch (IOException exception) {
            throw invalid("Archive Excel invalide.");
        }
    }

    public byte[] write(List<ProjectStore.ProjectView> projects, boolean template) {
        try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var editable = sheet(workbook, "Projets", EXTENDED_HEADERS);
            if (template) {
                addRow(editable, List.of("DEMO-001", "Mission de démonstration", "OUI", "OUI", "650", "50", "32500", "EUR"));
            } else {
                var external = sheet(workbook, "Autres sources", List.of("Référence", "Nom", "Actif", "Facturable", "TJM", "Jours budget", "Budget total", "Devise", "Source", "Organisation"));
                for (var project : projects) {
                    var values = new ArrayList<>(List.of(
                            project.reference() == null ? project.id().toString() : project.reference(),
                            project.name(),
                            project.active() ? "OUI" : "NON",
                            project.billableDefault() ? "OUI" : "NON",
                            project.dailyRate() != null ? project.dailyRate().toPlainString() : "",
                            project.budgetDays() != null ? project.budgetDays().toPlainString() : "",
                            project.totalPrice() != null ? project.totalPrice().toPlainString() : "",
                            project.currency() != null ? project.currency() : "EUR"
                    ));
                    if ("EXCEL".equals(project.source())) {
                        addRow(editable, values);
                    } else {
                        values.add(project.source());
                        values.add(project.organization() == null ? "" : project.organization());
                        addRow(external, values);
                    }
                }
            }
            var guide = sheet(workbook, "Instructions", List.of("Mode d'emploi"));
            guide.setColumnWidth(0, 110 * 256);
            addRow(guide, List.of("Seul l'onglet Projets est importé. Autres sources est un export de consultation (Azure, internes)."));
            addRow(guide, List.of("Référence stable et unique : lettres, chiffres, points, tirets, underscores (100 caractères maximum)."));
            addRow(guide, List.of("Nom : 255 caractères maximum. Actif et Facturable : OUI ou NON. Toutes les cellules au format texte."));
            addRow(guide, List.of("TJM, Jours budget, Budget total et Devise sont optionnels. Devise par défaut : EUR (ou USD, XAF, etc.)."));
            addRow(guide, List.of("Une référence existante est mise à jour. Une ligne absente n'est jamais supprimée. 5 000 lignes, 1 Mo maximum."));
            addRow(guide, List.of("Le modèle contient DEMO-001 : remplacez ou conservez cette ligne pour tester un import."));
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Export Excel indisponible.");
        }
    }

    private Sheet sheet(XSSFWorkbook workbook, String name, List<String> headers) {
        var sheet = workbook.createSheet(name);
        var font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        var style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        var textStyle = workbook.createCellStyle();
        textStyle.setDataFormat(workbook.createDataFormat().getFormat("@"));
        var row = sheet.createRow(0);
        row.setHeightInPoints(24);
        for (int column = 0; column < headers.size(); column++) {
            var cell = row.createCell(column);
            cell.setCellValue(headers.get(column));
            cell.setCellStyle(style);
            sheet.setColumnWidth(column, (column == 1 ? 48 : 24) * 256);
            sheet.setDefaultColumnStyle(column, textStyle);
        }
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, headers.size() - 1));
        return sheet;
    }

    private void addRow(Sheet sheet, List<String> values) {
        var row = sheet.createRow(sheet.getLastRowNum() + 1);
        for (int column = 0; column < values.size(); column++) {
            row.createCell(column, CellType.STRING).setCellValue(values.get(column));
        }
        sheet.setAutoFilter(new CellRangeAddress(0, sheet.getLastRowNum(), 0, values.size() - 1));
    }

    private InvalidProjectWorkbook invalid(String message) { return new InvalidProjectWorkbook(message); }
}
