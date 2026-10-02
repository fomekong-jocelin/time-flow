package cm.indyli.timeflow.timesheet.application;

import java.util.UUID;

/**
 * Synthèse d'un collaborateur / subordonné accessible pour le filtrage hiérarchique.
 */
public record SubordinateSummary(
        UUID id,
        String displayName,
        String email,
        String role
) {}
