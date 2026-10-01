package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrainingSessionRepository extends JpaRepository<TrainingSessionEntity, UUID> {

    boolean existsByReferenceIgnoreCase(String reference);

    boolean existsByReferenceIgnoreCaseAndIdNot(String reference, UUID id);

    List<TrainingSessionEntity> findAllByOrderByStartDateDesc();

    List<TrainingSessionEntity> findByTrainerIdOrderByStartDateDesc(UUID trainerId);

    List<TrainingSessionEntity> findByStatusOrderByStartDateDesc(TrainingStatus status);

    List<TrainingSessionEntity> findByCategoryOrderByStartDateDesc(TrainingCategory category);

    long countByStatus(TrainingStatus status);
}
