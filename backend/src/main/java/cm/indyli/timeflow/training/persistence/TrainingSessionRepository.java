package cm.indyli.timeflow.training.persistence;

import cm.indyli.timeflow.training.domain.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.*;

public interface TrainingSessionRepository extends JpaRepository<TrainingSessionEntity, UUID>,
        JpaSpecificationExecutor<TrainingSessionEntity> {
    boolean existsByReferenceIgnoreCase(String reference);
    boolean existsByReferenceIgnoreCaseAndIdNot(String reference, UUID id);
    List<TrainingSessionEntity> findAllByOrderByStartDateDesc();
    List<TrainingSessionEntity> findByTrainerIdOrderByStartDateDesc(UUID trainerId);
    List<TrainingSessionEntity> findByStatusOrderByStartDateDesc(TrainingStatus status);
    List<TrainingSessionEntity> findByCategoryOrderByStartDateDesc(TrainingCategory category);
    long countByStatus(TrainingStatus status);

    /** Every occupancy-changing command locks this same parent row before reading participants. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TrainingSessionEntity s where s.id = :id")
    Optional<TrainingSessionEntity> lockById(@Param("id") UUID id);

    @Query("select coalesce(sum(s.durationHours), 0) from TrainingSessionEntity s where s.status <> :cancelled")
    BigDecimal sumPlannedHours(@Param("cancelled") TrainingStatus cancelled);
}
