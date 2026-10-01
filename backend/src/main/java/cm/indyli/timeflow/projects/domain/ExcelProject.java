package cm.indyli.timeflow.projects.domain;

public record ExcelProject(String reference, String name, boolean active, boolean billable) {
    public ExcelProject {
        if (reference == null || !reference.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,99}")) {
            throw new IllegalArgumentException("Référence : 1 à 100 lettres, chiffres, points, tirets ou underscores.");
        }
        if (name == null || name.isBlank() || name.length() > 255) {
            throw new IllegalArgumentException("Nom obligatoire, limité à 255 caractères.");
        }
    }
}
