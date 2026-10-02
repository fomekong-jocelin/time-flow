package cm.indyli.timeflow.timesheet.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimesheetRepository extends JpaRepository<TimesheetEntity, UUID> {
    @Query("SELECT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries WHERE t.userId = :userId AND t.weekStart = :weekStart")
    Optional<TimesheetEntity> findByUserIdAndWeekStartWithEntries(@Param("userId") UUID userId, @Param("weekStart") LocalDate weekStart);
    Optional<TimesheetEntity> findByUserIdAndWeekStart(UUID userId, LocalDate weekStart);
    @Query("SELECT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries WHERE t.id = :id")
    Optional<TimesheetEntity> findByIdWithEntries(@Param("id") UUID id);
    @Query("SELECT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries WHERE t.userId IN :userIds AND (:status IS NULL OR t.status = :status) ORDER BY t.submittedAt DESC, t.weekStart DESC")
    List<TimesheetEntity> findByUserIdsAndStatusWithEntries(@Param("userIds") java.util.Collection<UUID> userIds, @Param("status") TimesheetStatus status);
    @Query("SELECT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries WHERE (:status IS NULL OR t.status = :status) ORDER BY t.submittedAt DESC, t.weekStart DESC")
    List<TimesheetEntity> findAllByStatusWithEntries(@Param("status") TimesheetStatus status);
    @Query("""
        SELECT DISTINCT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries
        WHERE t.weekStart >= :startWeek AND t.weekStart <= :endWeek AND t.status IN :statuses
        ORDER BY t.weekStart ASC
        """)
    List<TimesheetEntity> findByWeekRangeAndStatusesWithEntries(@Param("startWeek") LocalDate startWeek,
            @Param("endWeek") LocalDate endWeek, @Param("statuses") java.util.Collection<TimesheetStatus> statuses);
    @Query("""
        SELECT DISTINCT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries
        WHERE t.userId IN :userIds AND t.weekStart >= :startWeek AND t.weekStart <= :endWeek
          AND t.status IN :statuses ORDER BY t.weekStart ASC
        """)
    List<TimesheetEntity> findByUserIdsAndWeekRangeAndStatusesWithEntries(@Param("userIds") java.util.Collection<UUID> userIds,
            @Param("startWeek") LocalDate startWeek, @Param("endWeek") LocalDate endWeek,
            @Param("statuses") java.util.Collection<TimesheetStatus> statuses);
    /** Lifetime consumption is not restricted by the reporting period or employee filter. */
    @Query("""
        SELECT DISTINCT t FROM TimesheetEntity t LEFT JOIN FETCH t.entries
        WHERE t.status IN :statuses AND t.id IN
          (SELECT s.id FROM TimesheetEntity s JOIN s.entries e WHERE e.projectId IN :projectIds)
        """)
    List<TimesheetEntity> findByProjectIdsAndStatusesWithEntries(@Param("projectIds") java.util.Collection<UUID> projectIds,
            @Param("statuses") java.util.Collection<TimesheetStatus> statuses);
}
