package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Embeddable
public class TrainingParticipantEvent {
    @Enumerated(EnumType.STRING) @Column(name = "from_status", length = 20)
    private ParticipantStatus fromStatus;
    @Enumerated(EnumType.STRING) @Column(name = "to_status", nullable = false, length = 20)
    private ParticipantStatus toStatus;
    @Column(name = "changed_at", nullable = false) private OffsetDateTime changedAt;
    @Column(name = "actor_id") private UUID actorId;
    @Column(name = "reason", length = 500) private String reason;
    @Column(name = "event_kind", length = 32) private String eventKind;

    protected TrainingParticipantEvent() {}

    public TrainingParticipantEvent(ParticipantStatus from, ParticipantStatus to, UUID actorId) {
        this(from, to, actorId, null, from == null ? "REGISTRATION" : "STATUS_CHANGE");
    }

    public TrainingParticipantEvent(ParticipantStatus from, ParticipantStatus to, UUID actorId,
                                    String reason, String eventKind) {
        this.fromStatus = from;
        this.toStatus = to;
        this.actorId = actorId;
        this.changedAt = OffsetDateTime.now();
        this.reason = reason;
        this.eventKind = eventKind;
    }
    public ParticipantStatus getFromStatus() { return fromStatus; }
    public ParticipantStatus getToStatus() { return toStatus; }
    public UUID getActorId() { return actorId; }
    public OffsetDateTime getChangedAt() { return changedAt; }
    public String getReason() { return reason; }
    public String getEventKind() { return eventKind; }
}
