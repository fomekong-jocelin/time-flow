package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** expectedStatus prevents a stale administrative correction from overwriting a newer change. */
public record CorrectTrainingParticipantCommand(
        @NotNull ParticipantStatus expectedStatus,
        @NotNull ParticipantStatus status,
        @NotBlank @Size(min = 5, max = 500) String reason
) {}
