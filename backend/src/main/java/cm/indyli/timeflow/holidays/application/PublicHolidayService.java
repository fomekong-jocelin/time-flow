package cm.indyli.timeflow.holidays.application;

import cm.indyli.timeflow.holidays.domain.HolidayValidationException;
import cm.indyli.timeflow.holidays.persistence.PublicHolidayEntity;
import cm.indyli.timeflow.holidays.persistence.PublicHolidayRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PublicHolidayService {

    private final PublicHolidayRepository holidayRepository;

    public PublicHolidayService(PublicHolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<PublicHolidayDto> listByYear(int year) {
        return holidayRepository.findByYearOrderByHolidayDateAsc(year)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<PublicHolidayDto> listBetween(LocalDate start, LocalDate end) {
        return holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(start, end)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public PublicHolidayDto create(CreateHolidayCommand cmd) {
        if (cmd.name() == null || cmd.name().trim().isBlank()) {
            throw new HolidayValidationException("Le nom du jour férié est obligatoire.");
        }
        if (cmd.holidayDate() == null) {
            throw new HolidayValidationException("La date du jour férié est obligatoire.");
        }
        if (holidayRepository.findByHolidayDate(cmd.holidayDate()).isPresent()) {
            throw new HolidayValidationException("Un jour férié est déjà configuré à la date du " + cmd.holidayDate() + ".");
        }

        var entity = PublicHolidayEntity.create(
                cmd.holidayDate(),
                cmd.name().trim(),
                cmd.isWorked()
        );

        entity = holidayRepository.save(entity);
        return toDto(entity);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public PublicHolidayDto update(UUID id, UpdateHolidayCommand cmd) {
        var entity = holidayRepository.findById(id)
                .orElseThrow(() -> new HolidayValidationException("Jour férié introuvable."));

        if (cmd.name() == null || cmd.name().trim().isBlank()) {
            throw new HolidayValidationException("Le nom du jour férié est obligatoire.");
        }

        entity.update(cmd.name().trim(), cmd.isWorked());
        entity = holidayRepository.save(entity);
        return toDto(entity);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public void delete(UUID id) {
        var entity = holidayRepository.findById(id)
                .orElseThrow(() -> new HolidayValidationException("Jour férié introuvable."));
        holidayRepository.delete(entity);
    }

    private PublicHolidayDto toDto(PublicHolidayEntity entity) {
        return new PublicHolidayDto(
                entity.getId(),
                entity.getHolidayDate(),
                entity.getName(),
                entity.isWorked(),
                entity.getYear()
        );
    }
}
