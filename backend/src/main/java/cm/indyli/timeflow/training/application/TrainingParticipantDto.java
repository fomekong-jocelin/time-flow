package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.training.domain.ParticipantStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TrainingParticipantDto(
        UUID id,
        UUID userId,
        String userDisplayName,
        String userEmail,
        ParticipantStatus status,
        OffsetDateTime registeredAt
) {}
