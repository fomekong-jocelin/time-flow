package cm.indyli.timeflow.holidays.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateHolidayCommand(
        @NotNull LocalDate holidayDate,
        @NotBlank String name,
        boolean isWorked
) {
}
