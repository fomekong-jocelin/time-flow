package cm.indyli.timeflow.holidays.application;

import jakarta.validation.constraints.NotBlank;

public record UpdateHolidayCommand(
        @NotBlank String name,
        boolean isWorked
) {
}
