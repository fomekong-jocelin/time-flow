package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.training.domain.DeliveryMode;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TrainingSessionDto(
        UUID id,
        String reference,
        String title,
        String description,
        UUID trainerId,
        String trainerDisplayName,
        String trainerEmail,
        String location,
        DeliveryMode deliveryMode,
        TrainingCategory category,
        TrainingStatus status,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal durationHours,
        int maxParticipants,
        int registeredCount,
        boolean isCurrentUserRegistered,
        boolean isCurrentUserTrainer,
        List<TrainingParticipantDto> participants,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
