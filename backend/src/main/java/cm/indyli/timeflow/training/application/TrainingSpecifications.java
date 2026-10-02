package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

final class TrainingSpecifications {
    private TrainingSpecifications() {}
    static Specification<TrainingSessionEntity> matching(String text, TrainingStatus status,
            TrainingCategory category, DeliveryMode mode, UUID trainerId, boolean mine, UUID userId) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (category != null) predicates.add(cb.equal(root.get("category"), category));
            if (mode != null) predicates.add(cb.equal(root.get("deliveryMode"), mode));
            if (trainerId != null) predicates.add(cb.equal(root.get("trainerId"), trainerId));
            if (text != null && !text.isBlank()) {
                String escaped = text.trim().toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_");
                String pattern = "%" + escaped + "%";
                var trainers = query.subquery(UUID.class);
                var user = trainers.from(AppUserEntity.class);
                trainers.select(user.get("id")).where(cb.like(cb.lower(user.get("displayName")), pattern, '!'));
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '!'),
                        cb.like(cb.lower(root.get("reference")), pattern, '!'),
                        cb.like(cb.lower(root.get("description")), pattern, '!'),
                        cb.like(cb.lower(root.get("location")), pattern, '!'), root.get("trainerId").in(trainers)));
            }
            if (mine) {
                if (userId == null) return cb.disjunction();
                var registrations = query.subquery(UUID.class);
                var participant = registrations.from(TrainingParticipantEntity.class);
                registrations.select(participant.get("trainingId")).where(cb.equal(participant.get("userId"), userId),
                        cb.notEqual(participant.get("status"), ParticipantStatus.CANCELLED));
                predicates.add(cb.or(cb.equal(root.get("trainerId"), userId), root.get("id").in(registrations)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
