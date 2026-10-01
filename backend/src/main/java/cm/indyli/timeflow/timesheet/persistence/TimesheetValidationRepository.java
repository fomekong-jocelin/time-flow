package cm.indyli.timeflow.timesheet.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TimesheetValidationRepository extends JpaRepository<TimesheetValidationEntity, UUID> {
    List<TimesheetValidationEntity> findByTimesheetIdOrderByDecidedAtDesc(UUID timesheetId);
}
