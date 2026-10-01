package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatusException;
import cm.indyli.timeflow.timesheet.domain.TimesheetValidationException;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimesheetServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;
    @Mock
    private AppUserRepository userRepository;
    @Mock
    private ProjectStore projectStore;
    @Mock
    private JdbcClient jdbc;
    @Mock
    private cm.indyli.timeflow.holidays.persistence.PublicHolidayRepository publicHolidayRepository;

    private TimesheetService timesheetService;

    private final UUID userId = UUID.randomUUID();
    private final LocalDate monday = LocalDate.of(2026, 10, 5);
    private final UUID projectId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        timesheetService = new TimesheetService(timesheetRepository, userRepository, projectStore, jdbc, publicHolidayRepository);
    }

    @Test
    void getTimesheet_returnsEmptyDraftWhenNotFound() {
        var user = AppUserEntity.local("test@indyli.com", "Test User", UserRole.COLLABORATOR);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, monday)).thenReturn(Optional.empty());

        var result = timesheetService.getTimesheet(userId, monday);

        assertThat(result.id()).isNull();
        assertThat(result.status()).isEqualTo(TimesheetStatus.DRAFT);
        assertThat(result.totalMinutes()).isZero();
        assertThat(result.weeklyTargetMinutes()).isEqualTo(2100);
        assertThat(result.lines()).isEmpty();
        assertThat(result.editable()).isTrue();
    }

    @Test
    void saveDraft_savesValidEntriesAndCalculatesTotals() {
        var user = AppUserEntity.local("test@indyli.com", "Test User", UserRole.COLLABORATOR);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, monday)).thenReturn(Optional.empty());

        var project = new ProjectStore.ProjectView(projectId, "Mission Alpha", "LOCAL", "INDYLI", true, true, "ALPHA-1");
        when(projectStore.findById(projectId)).thenReturn(Optional.of(project));

        var command = new SaveTimesheetCommand(List.of(
                new SaveTimesheetCommand.LineCommand(
                        projectId,
                        "PROJECT",
                        true,
                        "Dev frontend",
                        List.of(
                                new SaveTimesheetCommand.EntryCommand(monday, 420),
                                new SaveTimesheetCommand.EntryCommand(monday.plusDays(1), 480)
                        )
                )
        ));

        when(timesheetRepository.save(any(TimesheetEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = timesheetService.saveDraft(userId, monday, command);

        assertThat(result.status()).isEqualTo(TimesheetStatus.DRAFT);
        assertThat(result.totalMinutes()).isEqualTo(900);
        assertThat(result.billableMinutes()).isEqualTo(900);
        assertThat(result.internalMinutes()).isZero();
        assertThat(result.lines()).hasSize(1);
        assertThat(result.lines().getFirst().projectName()).isEqualTo("Mission Alpha");
    }

    @Test
    void saveDraft_rejectsInactiveProject() {
        var user = AppUserEntity.local("test@indyli.com", "Test User", UserRole.COLLABORATOR);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, monday)).thenReturn(Optional.empty());

        var inactiveProject = new ProjectStore.ProjectView(projectId, "Ancien Projet", "LOCAL", "INDYLI", false, true, "OLD-1");
        when(projectStore.findById(projectId)).thenReturn(Optional.of(inactiveProject));

        var command = new SaveTimesheetCommand(List.of(
                new SaveTimesheetCommand.LineCommand(
                        projectId,
                        "PROJECT",
                        true,
                        null,
                        List.of(new SaveTimesheetCommand.EntryCommand(monday, 420))
                )
        ));

        assertThatThrownBy(() -> timesheetService.saveDraft(userId, monday, command))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("n'est plus actif");
    }

    @Test
    void saveDraft_rejectsWhenAlreadySubmitted() {
        var user = AppUserEntity.local("test@indyli.com", "Test User", UserRole.COLLABORATOR);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        var timesheet = TimesheetEntity.draft(userId, monday);
        timesheet.submit();
        when(timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, monday)).thenReturn(Optional.of(timesheet));

        var command = new SaveTimesheetCommand(List.of());

        assertThatThrownBy(() -> timesheetService.saveDraft(userId, monday, command))
                .isInstanceOf(TimesheetStatusException.class)
                .hasMessageContaining("ne peut plus être modifiée");
    }

    @Test
    void submit_transitionsToSubmitted() {
        var user = AppUserEntity.local("test@indyli.com", "Test User", UserRole.COLLABORATOR);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        var timesheet = TimesheetEntity.draft(userId, monday);
        var entry = TimeEntryEntity.create(projectId, "PROJECT", monday, 420, true, "Tâche terminée");
        timesheet.replaceEntries(List.of(entry));

        when(timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, monday)).thenReturn(Optional.of(timesheet));
        when(timesheetRepository.save(any(TimesheetEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = timesheetService.submit(userId, monday, null);

        assertThat(result.status()).isEqualTo(TimesheetStatus.SUBMITTED);
        assertThat(result.submittedAt()).isNotNull();
        assertThat(result.editable()).isFalse();
    }
}
