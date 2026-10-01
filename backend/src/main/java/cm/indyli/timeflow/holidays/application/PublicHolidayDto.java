package cm.indyli.timeflow.holidays.application;

import java.time.LocalDate;
import java.util.UUID;

public record PublicHolidayDto(
        UUID id,
        LocalDate holidayDate,
        String name,
        boolean isWorked,
        int year
) {
}
