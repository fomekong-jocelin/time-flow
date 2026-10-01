package cm.indyli.timeflow.holidays.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PublicHolidayRepository extends JpaRepository<PublicHolidayEntity, UUID> {

    List<PublicHolidayEntity> findByYearOrderByHolidayDateAsc(int year);

    Optional<PublicHolidayEntity> findByHolidayDate(LocalDate holidayDate);

    List<PublicHolidayEntity> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate start, LocalDate end);
}
