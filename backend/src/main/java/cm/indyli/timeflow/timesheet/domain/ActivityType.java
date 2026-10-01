package cm.indyli.timeflow.timesheet.domain;

public enum ActivityType {
    PROJECT("Projet"),
    TRAINING("Formation"),
    SUPPORT("Support"),
    INTERNAL("Interne");

    private final String label;

    ActivityType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
