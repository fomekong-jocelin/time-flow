package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "training_participant", uniqueConstraints = {
        @UniqueConstraint(name = "uq_training_user", columnNames = {"training_id", "user_id"})
})
public class TrainingParticipantEntity {

    @Id
    private UUID id;

    @Column(name = "training_id", nullable = false)
    private UUID trainingId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ParticipantStatus status = ParticipantStatus.REGISTERED;

    @Column(name = "registered_at", nullable = false)
    private OffsetDateTime registeredAt;

    protected TrainingParticipantEntity() {
    }

    public static TrainingParticipantEntity create(UUID trainingId, UUID userId, ParticipantStatus status) {
        var entity = new TrainingParticipantEntity();
        entity.id = UUID.randomUUID();
        entity.trainingId = trainingId;
        entity.userId = userId;
        entity.status = status != null ? status : ParticipantStatus.REGISTERED;
        entity.registeredAt = OffsetDateTime.now();
        return entity;
    }

    public void setStatus(ParticipantStatus status) {
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public UUID getTrainingId() {
        return trainingId;
    }

    public UUID getUserId() {
        return userId;
    }

    public ParticipantStatus getStatus() {
        return status;
    }

    public OffsetDateTime getRegisteredAt() {
        return registeredAt;
    }
}
