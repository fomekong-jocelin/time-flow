package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TrainingParticipantRepository extends JpaRepository<TrainingParticipantEntity, UUID> {
    List<TrainingParticipantEntity> findByTrainingId(UUID trainingId);
    List<TrainingParticipantEntity> findByUserId(UUID userId);
    List<TrainingParticipantEntity> findByUserIdAndTrainingIdIn(UUID userId, Collection<UUID> trainingIds);
    Optional<TrainingParticipantEntity> findByTrainingIdAndUserId(UUID trainingId, UUID userId);
    boolean existsByTrainingIdAndUserId(UUID trainingId, UUID userId);
    boolean existsByTrainingId(UUID trainingId);
    long countByTrainingIdAndStatus(UUID trainingId, ParticipantStatus status);
    void deleteByTrainingIdAndUserId(UUID trainingId, UUID userId);

    @Query("select p.trainingId as trainingId, count(p) as total from TrainingParticipantEntity p " +
           "where p.trainingId in :ids and p.status <> :cancelled group by p.trainingId")
    List<Occupancy> countOccupiedByTrainingIds(@Param("ids") Collection<UUID> ids,
                                              @Param("cancelled") ParticipantStatus cancelled);

    @Query("select count(p) from TrainingParticipantEntity p, TrainingSessionEntity s " +
           "where p.trainingId = s.id and p.status <> :participantCancelled and s.status <> :sessionCancelled")
    long countActiveRegistrations(@Param("participantCancelled") ParticipantStatus participantCancelled,
                                  @Param("sessionCancelled") TrainingStatus sessionCancelled);

    interface Occupancy {
        UUID getTrainingId();
        long getTotal();
    }
}
