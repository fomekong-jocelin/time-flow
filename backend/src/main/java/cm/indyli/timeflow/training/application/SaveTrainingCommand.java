package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.training.domain.DeliveryMode;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SaveTrainingCommand(
        @NotBlank(message = "La référence est obligatoire")
        @Size(max = 50, message = "La référence ne doit pas dépasser 50 caractères")
        String reference,

        @NotBlank(message = "Le titre est obligatoire")
        @Size(max = 200, message = "Le titre ne doit pas dépasser 200 caractères")
        String title,

        @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
        String description,

        UUID trainerId,

        @Size(max = 200, message = "Le lieu ou lien ne doit pas dépasser 200 caractères")
        String location,

        @NotNull(message = "Le mode de diffusion est obligatoire")
        DeliveryMode deliveryMode,

        @NotNull(message = "La catégorie est obligatoire")
        TrainingCategory category,

        @NotNull(message = "Le statut est obligatoire")
        TrainingStatus status,

        @NotNull(message = "La date de début est obligatoire")
        LocalDate startDate,

        @NotNull(message = "La date de fin est obligatoire")
        LocalDate endDate,

        @NotNull(message = "La durée en heures est obligatoire")
        @DecimalMin(value = "0.5", message = "La durée doit être d'au moins 30 minutes")
        BigDecimal durationHours,

        @Min(value = 1, message = "Le nombre maximum de participants doit être d'au moins 1")
        @Max(value = 500, message = "Le nombre maximum de participants ne peut pas dépasser 500")
        int maxParticipants
) {}
