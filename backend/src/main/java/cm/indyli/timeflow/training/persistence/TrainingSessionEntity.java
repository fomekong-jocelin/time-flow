package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.DeliveryMode;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_session")
public class TrainingSessionEntity {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String reference;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "trainer_id")
    private UUID trainerId;

    @Column(length = 200)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", nullable = false, length = 20)
    private DeliveryMode deliveryMode = DeliveryMode.REMOTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TrainingCategory category = TrainingCategory.INTERNAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TrainingStatus status = TrainingStatus.PLANNED;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "duration_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal durationHours = BigDecimal.valueOf(7.0);

    @Column(name = "max_participants", nullable = false)
    private int maxParticipants = 10;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected TrainingSessionEntity() {
    }

    public static TrainingSessionEntity create(
            String reference,
            String title,
            String description,
            UUID trainerId,
            String location,
            DeliveryMode deliveryMode,
            TrainingCategory category,
            TrainingStatus status,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal durationHours,
            int maxParticipants
    ) {
        var entity = new TrainingSessionEntity();
        entity.id = UUID.randomUUID();
        entity.reference = reference.trim();
        entity.title = title.trim();
        entity.description = description != null ? description.trim() : null;
        entity.trainerId = trainerId;
        entity.location = location != null ? location.trim() : null;
        entity.deliveryMode = deliveryMode != null ? deliveryMode : DeliveryMode.REMOTE;
        entity.category = category != null ? category : TrainingCategory.INTERNAL;
        entity.status = status != null ? status : TrainingStatus.PLANNED;
        entity.startDate = startDate;
        entity.endDate = endDate;
        entity.durationHours = durationHours != null ? durationHours : BigDecimal.valueOf(7.0);
        entity.maxParticipants = maxParticipants > 0 ? maxParticipants : 10;
        entity.createdAt = OffsetDateTime.now();
        entity.updatedAt = OffsetDateTime.now();
        return entity;
    }

    public void update(
            String reference,
            String title,
            String description,
            UUID trainerId,
            String location,
            DeliveryMode deliveryMode,
            TrainingCategory category,
            TrainingStatus status,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal durationHours,
            int maxParticipants
    ) {
        this.reference = reference.trim();
        this.title = title.trim();
        this.description = description != null ? description.trim() : null;
        this.trainerId = trainerId;
        this.location = location != null ? location.trim() : null;
        this.deliveryMode = deliveryMode != null ? deliveryMode : this.deliveryMode;
        this.category = category != null ? category : this.category;
        this.status = status != null ? status : this.status;
        this.startDate = startDate;
        this.endDate = endDate;
        this.durationHours = durationHours != null ? durationHours : this.durationHours;
        this.maxParticipants = maxParticipants > 0 ? maxParticipants : this.maxParticipants;
        this.updatedAt = OffsetDateTime.now();
    }

    public void setStatus(TrainingStatus status) {
        this.status = status;
        this.updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public UUID getTrainerId() {
        return trainerId;
    }

    public String getLocation() {
        return location;
    }

    public DeliveryMode getDeliveryMode() {
        return deliveryMode;
    }

    public TrainingCategory getCategory() {
        return category;
    }

    public TrainingStatus getStatus() {
        return status;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public BigDecimal getDurationHours() {
        return durationHours;
    }

    public int getMaxParticipants() {
        return maxParticipants;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
