package cm.indyli.timeflow.timesheet.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface TimesheetRepository extends JpaRepository<TimesheetEntity, UUID> {

    @Query("SELECT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries WHERE t.userId = :userId AND t.weekStart = :weekStart")
    Optional<TimesheetEntity> findByUserIdAndWeekStartWithEntries(@Param("userId") UUID userId, @Param("weekStart") LocalDate weekStart);

    Optional<TimesheetEntity> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);
}
