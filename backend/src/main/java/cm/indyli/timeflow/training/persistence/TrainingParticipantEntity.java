package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "training_participant", uniqueConstraints = {
        @UniqueConstraint(name = "uq_training_user", columnNames = {"training_id", "user_id"})
})
public class TrainingParticipantEntity {
    @Id private UUID id;
    @Column(name = "training_id", nullable = false) private UUID trainingId;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ParticipantStatus status = ParticipantStatus.REGISTERED;
    @Column(name = "registered_at", nullable = false) private OffsetDateTime registeredAt;
    @ElementCollection
    @CollectionTable(name = "training_participant_event", joinColumns = @JoinColumn(name = "participant_id"))
    @OrderColumn(name = "event_index")
    private List<TrainingParticipantEvent> events = new ArrayList<>();

    protected TrainingParticipantEntity() {}

    public static TrainingParticipantEntity create(UUID trainingId, UUID userId, ParticipantStatus status) {
        return create(trainingId, userId, status, null);
    }

    public static TrainingParticipantEntity create(UUID trainingId, UUID userId, ParticipantStatus status, UUID actorId) {
        var entity = new TrainingParticipantEntity();
        entity.id = UUID.randomUUID();
        entity.trainingId = trainingId;
        entity.userId = userId;
        entity.status = Objects.requireNonNull(status);
        entity.registeredAt = OffsetDateTime.now();
        entity.events.add(new TrainingParticipantEvent(null, status, actorId));
        return entity;
    }

    public void changeStatus(ParticipantStatus next, UUID actorId) {
        Objects.requireNonNull(next);
        if (status == next) return;
        events.add(new TrainingParticipantEvent(status, next, actorId));
        status = next;
    }

    public void setStatus(ParticipantStatus status) { changeStatus(status, null); }
    public UUID getId() { return id; }
    public UUID getTrainingId() { return trainingId; }
    public UUID getUserId() { return userId; }
    public ParticipantStatus getStatus() { return status; }
    public OffsetDateTime getRegisteredAt() { return registeredAt; }
    public List<TrainingParticipantEvent> getEvents() { return List.copyOf(events); }
}
