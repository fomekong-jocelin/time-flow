package cm.indyli.timeflow.holidays.api;

import cm.indyli.timeflow.holidays.application.CreateHolidayCommand;
import cm.indyli.timeflow.holidays.application.PublicHolidayDto;
import cm.indyli.timeflow.holidays.application.PublicHolidayService;
import cm.indyli.timeflow.holidays.application.UpdateHolidayCommand;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/holidays")
public class PublicHolidayController {

    private final PublicHolidayService holidayService;

    public PublicHolidayController(PublicHolidayService holidayService) {
        this.holidayService = holidayService;
    }

    @GetMapping
    public List<PublicHolidayDto> list(@RequestParam(value = "year", required = false) Integer year) {
        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        return holidayService.listByYear(targetYear);
    }

    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public ResponseEntity<PublicHolidayDto> create(@Valid @RequestBody CreateHolidayCommand cmd) {
        var created = holidayService.create(cmd);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public PublicHolidayDto update(@PathVariable UUID id, @Valid @RequestBody UpdateHolidayCommand cmd) {
        return holidayService.update(id, cmd);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public void delete(@PathVariable UUID id) {
        holidayService.delete(id);
    }
}
