package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.training.domain.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Date-only sessions remain supported; timestamps must be supplied as a complete pair. */
public record SaveTrainingCommand(
        @NotBlank @Size(max = 50) String reference,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 2000) String description,
        UUID trainerId,
        @Size(max = 200) String location,
        @NotNull DeliveryMode deliveryMode,
        @NotNull TrainingCategory category,
        @NotNull TrainingStatus status,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull @DecimalMin("0.5") @Digits(integer = 4, fraction = 2) BigDecimal durationHours,
        @Min(1) @Max(500) int maxParticipants,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        @Size(max = 64) String timeZone
) {
    public SaveTrainingCommand(String reference, String title, String description, UUID trainerId,
            String location, DeliveryMode deliveryMode, TrainingCategory category, TrainingStatus status,
            LocalDate startDate, LocalDate endDate, BigDecimal durationHours, int maxParticipants) {
        this(reference, title, description, trainerId, location, deliveryMode, category, status,
                startDate, endDate, durationHours, maxParticipants, null, null, null);
    }
}
