package cm.indyli.timeflow.billing.application;

/** Spreadsheet-targeted CSV text. XLSX STRING cells remain the preferred lossless export. */
public final class CsvCell {
    private CsvCell() {}
    public static String text(String value) {
        if (value == null) return "";
        int first = 0;
        while (first < value.length()) {
            int cp = value.codePointAt(first);
            if (!Character.isWhitespace(cp) && !Character.isSpaceChar(cp)
                    && !Character.isISOControl(cp) && Character.getType(cp) != Character.FORMAT) break;
            first += Character.charCount(cp);
        }
        boolean controlPrefix = !value.isEmpty() && (value.charAt(0) == '\t' || value.charAt(0) == '\r' || value.charAt(0) == '\n');
        boolean formula = first < value.length() && "=+-@＝＋－＠".indexOf(value.charAt(first)) >= 0;
        String safe = controlPrefix || formula ? "'" + value : value;
        if (controlPrefix || formula || safe.indexOf(';') >= 0 || safe.indexOf('"') >= 0 || safe.indexOf('\n') >= 0 || safe.indexOf('\r') >= 0) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }
}
