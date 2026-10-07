package cm.indyli.timeflow.training.application;

import java.math.BigDecimal;

public record TrainingKpiDto(
        long totalSessions,
        long plannedSessions,
        long inProgressSessions,
        long completedSessions,
        BigDecimal totalPlannedHours,
        long totalRegistrations
) {}
