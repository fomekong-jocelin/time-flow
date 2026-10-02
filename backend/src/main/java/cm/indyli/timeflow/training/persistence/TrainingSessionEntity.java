package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_session")
public class TrainingSessionEntity {
    @Id private UUID id;
    @Column(nullable = false, unique = true, length = 50) private String reference;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 2000) private String description;
    @Column(name = "trainer_id") private UUID trainerId;
    @Column(length = 200) private String location;
    @Enumerated(EnumType.STRING) @Column(name = "delivery_mode", nullable = false, length = 20)
    private DeliveryMode deliveryMode = DeliveryMode.REMOTE;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private TrainingCategory category = TrainingCategory.INTERNAL;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private TrainingStatus status = TrainingStatus.PLANNED;
    @Column(name = "start_date", nullable = false) private LocalDate startDate;
    @Column(name = "end_date", nullable = false) private LocalDate endDate;
    @Column(name = "starts_at") private OffsetDateTime startsAt;
    @Column(name = "ends_at") private OffsetDateTime endsAt;
    @Column(name = "time_zone", length = 64) private String timeZone;
    @Column(name = "duration_hours", nullable = false, precision = 6, scale = 2)
    private BigDecimal durationHours = BigDecimal.valueOf(7);
    @Column(name = "max_participants", nullable = false) private int maxParticipants = 10;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

    protected TrainingSessionEntity() {}

    public static TrainingSessionEntity create(String reference, String title, String description,
            UUID trainerId, String location, DeliveryMode deliveryMode, TrainingCategory category,
            TrainingStatus status, LocalDate startDate, LocalDate endDate,
            BigDecimal durationHours, int maxParticipants) {
        var entity = new TrainingSessionEntity();
        entity.id = UUID.randomUUID();
        entity.createdAt = OffsetDateTime.now();
        entity.update(reference, title, description, trainerId, location, deliveryMode, category,
                status, startDate, endDate, durationHours, maxParticipants);
        return entity;
    }

    public void update(String reference, String title, String description, UUID trainerId,
            String location, DeliveryMode deliveryMode, TrainingCategory category, TrainingStatus status,
            LocalDate startDate, LocalDate endDate, BigDecimal durationHours, int maxParticipants) {
        this.reference = reference.trim();
        this.title = title.trim();
        this.description = description != null ? description.trim() : null;
        this.trainerId = trainerId;
        this.location = location != null ? location.trim() : null;
        this.deliveryMode = deliveryMode;
        this.category = category;
        this.status = status;
        this.startDate = startDate;
        this.endDate = endDate;
        this.durationHours = durationHours;
        this.maxParticipants = maxParticipants;
        this.updatedAt = OffsetDateTime.now();
    }

    public void schedule(OffsetDateTime startsAt, OffsetDateTime endsAt, String timeZone) {
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.timeZone = timeZone;
        this.updatedAt = OffsetDateTime.now();
    }

    public void setStatus(TrainingStatus status) { this.status = status; this.updatedAt = OffsetDateTime.now(); }
    public UUID getId() { return id; }
    public String getReference() { return reference; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public UUID getTrainerId() { return trainerId; }
    public String getLocation() { return location; }
    public DeliveryMode getDeliveryMode() { return deliveryMode; }
    public TrainingCategory getCategory() { return category; }
    public TrainingStatus getStatus() { return status; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public OffsetDateTime getStartsAt() { return startsAt; }
    public OffsetDateTime getEndsAt() { return endsAt; }
    public String getTimeZone() { return timeZone; }
    public BigDecimal getDurationHours() { return durationHours; }
    public int getMaxParticipants() { return maxParticipants; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
