package cm.indyli.timeflow.holidays.application;

import cm.indyli.timeflow.holidays.domain.HolidayValidationException;
import cm.indyli.timeflow.holidays.persistence.PublicHolidayEntity;
import cm.indyli.timeflow.holidays.persistence.PublicHolidayRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicHolidayServiceTest {

    @Mock
    private PublicHolidayRepository holidayRepository;

    private PublicHolidayService holidayService;

    @BeforeEach
    void setUp() {
        holidayService = new PublicHolidayService(holidayRepository);
    }

    @Test
    void listByYear_returnsListOfHolidays() {
        var holiday = PublicHolidayEntity.create(LocalDate.of(2026, 1, 1), "Jour de l'An", false);
        when(holidayRepository.findByYearOrderByHolidayDateAsc(2026)).thenReturn(List.of(holiday));

        var result = holidayService.listByYear(2026);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().name()).isEqualTo("Jour de l'An");
        assertThat(result.getFirst().holidayDate()).isEqualTo(LocalDate.of(2026, 1, 1));
        assertThat(result.getFirst().isWorked()).isFalse();
    }

    @Test
    void create_createsNewHolidaySuccessfully() {
        var cmd = new CreateHolidayCommand(LocalDate.of(2026, 7, 14), "Fête Nationale", false);
        when(holidayRepository.findByHolidayDate(cmd.holidayDate())).thenReturn(Optional.empty());
        when(holidayRepository.save(any(PublicHolidayEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = holidayService.create(cmd);

        assertThat(result.name()).isEqualTo("Fête Nationale");
        assertThat(result.holidayDate()).isEqualTo(LocalDate.of(2026, 7, 14));
        assertThat(result.year()).isEqualTo(2026);
    }

    @Test
    void create_throwsWhenDateAlreadyExists() {
        var date = LocalDate.of(2026, 5, 1);
        var cmd = new CreateHolidayCommand(date, "Fête du Travail", false);
        when(holidayRepository.findByHolidayDate(date))
                .thenReturn(Optional.of(PublicHolidayEntity.create(date, "Existant", false)));

        assertThatThrownBy(() -> holidayService.create(cmd))
                .isInstanceOf(HolidayValidationException.class)
                .hasMessageContaining("déjà configuré");
    }

    @Test
    void update_updatesHolidayFields() {
        var id = UUID.randomUUID();
        var entity = PublicHolidayEntity.create(LocalDate.of(2026, 5, 8), "Victoire 1945", false);
        when(holidayRepository.findById(id)).thenReturn(Optional.of(entity));
        when(holidayRepository.save(any(PublicHolidayEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = holidayService.update(id, new UpdateHolidayCommand("Victoire 1945 (Travaillé)", true));

        assertThat(result.name()).isEqualTo("Victoire 1945 (Travaillé)");
        assertThat(result.isWorked()).isTrue();
    }

    @Test
    void delete_removesHoliday() {
        var id = UUID.randomUUID();
        var entity = PublicHolidayEntity.create(LocalDate.of(2026, 11, 11), "Armistice", false);
        when(holidayRepository.findById(id)).thenReturn(Optional.of(entity));

        holidayService.delete(id);

        verify(holidayRepository).delete(entity);
    }
}
