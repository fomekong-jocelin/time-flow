package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.ParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrainingParticipantRepository extends JpaRepository<TrainingParticipantEntity, UUID> {

    List<TrainingParticipantEntity> findByTrainingId(UUID trainingId);

    List<TrainingParticipantEntity> findByUserId(UUID userId);

    Optional<TrainingParticipantEntity> findByTrainingIdAndUserId(UUID trainingId, UUID userId);

    boolean existsByTrainingIdAndUserId(UUID trainingId, UUID userId);

    long countByTrainingId(UUID trainingId);

    long countByTrainingIdAndStatus(UUID trainingId, ParticipantStatus status);

    void deleteByTrainingIdAndUserId(UUID trainingId, UUID userId);
}
