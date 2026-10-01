package cm.indyli.timeflow.workschedule.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkScheduleProfileRepository extends JpaRepository<WorkScheduleProfileEntity, UUID> {
    Optional<WorkScheduleProfileEntity> findByCodeIgnoreCase(String code);

    Optional<WorkScheduleProfileEntity> findByIsDefaultTrue();

    List<WorkScheduleProfileEntity> findAllByOrderByIsDefaultDescActiveDescNameAsc();

    List<WorkScheduleProfileEntity> findByActiveTrueOrderByIsDefaultDescNameAsc();

    @Modifying
    @Query("UPDATE WorkScheduleProfileEntity p SET p.isDefault = false WHERE p.id <> :id")
    void resetOtherDefaults(@Param("id") UUID id);
}
