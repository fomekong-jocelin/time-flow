package cm.indyli.timeflow.billing.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;
    @Mock
    private AppUserRepository userRepository;
    @Mock
    private ProjectStore projectStore;
    @Mock
    private WorkScheduleProfileRepository workScheduleProfileRepository;

    private BillingService service;

    private final UUID collabId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID directionId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private TimeFlowPrincipal collabPrincipal;
    private TimeFlowPrincipal managerPrincipal;
    private TimeFlowPrincipal directionPrincipal;

    private AppUserEntity collabUser;

    @BeforeEach
    void setUp() {
        service = new BillingService(timesheetRepository, userRepository, projectStore, workScheduleProfileRepository);

        collabPrincipal = new TimeFlowPrincipal(collabId, "collab@indyli.com", "Collab User", UserRole.COLLABORATOR, AuthProvider.LOCAL);
        managerPrincipal = new TimeFlowPrincipal(managerId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL);
        directionPrincipal = new TimeFlowPrincipal(directionId, "direction@indyli.com", "Direction User", UserRole.DIRECTION, AuthProvider.LOCAL);

        collabUser = AppUserEntity.local("collab@indyli.com", "Collab User", UserRole.COLLABORATOR);
        collabUser.setDailyRate(BigDecimal.valueOf(450.00));
        // Use reflection to set ID if needed, or rely on mock mapping
        try {
            var field = AppUserEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(collabUser, collabId);
        } catch (Exception ignored) {}
    }

    @Test
    @DisplayName("Manager can see billable days and hours but NEVER rates, costs, or amounts")
    void managerCanSeeDaysAndHours_butNeverRatesOrPrices() {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        TimesheetEntity sheet = TimesheetEntity.draft(collabId, weekStart);
        sheet.submit();
        sheet.validate();

        // 3 days = 3 * 420 = 1260 mins billable
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 5), 420, true, "Jour 1"));
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 6), 420, true, "Jour 2"));
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 7), 420, true, "Jour 3"));

        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(collabUser));
        when(timesheetRepository.findByUserIdsAndWeekRangeAndStatusesWithEntries(eq(Set.of(managerId, collabId)), any(), any(), any()))
                .thenReturn(List.of(sheet));
        when(userRepository.findAll()).thenReturn(List.of(collabUser));

        var projectView = new ProjectStore.ProjectView(projectId, "Mission Client", "MANUAL", "Client X", true, true, "PRJ-100", BigDecimal.valueOf(600.00));
        when(projectStore.list()).thenReturn(List.of(projectView));

        // When manager gets overview
        BillingOverview overview = service.getOverview(managerPrincipal, "2026-10", null, null);

        assertThat(overview).isNotNull();
        assertThat(overview.billableMinutes()).isEqualTo(1260);
        assertThat(overview.billableDays()).isEqualTo(3.0);
        assertThat(overview.canViewFinancials()).isFalse();
        assertThat(overview.totalFinancialAmount()).isNull();

        assertThat(overview.projects()).hasSize(1);
        var proj = overview.projects().getFirst();
        assertThat(proj.billableDays()).isEqualTo(3.0);
        assertThat(proj.dailyRate()).isNull();
        assertThat(proj.totalAmount()).isNull();

        assertThat(overview.users()).hasSize(1);
        var usr = overview.users().getFirst();
        assertThat(usr.billableDays()).isEqualTo(3.0);
        assertThat(usr.dailyRate()).isNull();
        assertThat(usr.totalAmount()).isNull();

        // When manager gets details
        var details = service.getDetails(managerPrincipal, "2026-10", null, null);
        assertThat(details).hasSize(3);
        for (var d : details) {
            assertThat(d.billableDays()).isEqualTo(1.0);
            assertThat(d.dailyRate()).isNull();
            assertThat(d.totalAmount()).isNull();
        }
    }

    @Test
    @DisplayName("Direction can see billable days, hours AND daily rates, costs, and amounts")
    void directionCanSeeDailyRatesAndAmounts() {
        LocalDate weekStart = LocalDate.of(2026, 10, 5);
        TimesheetEntity sheet = TimesheetEntity.draft(collabId, weekStart);
        sheet.submit();
        sheet.validate();

        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 5), 420, true, "Jour 1"));
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 6), 420, true, "Jour 2"));
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJET", LocalDate.of(2026, 10, 7), 420, true, "Jour 3"));

        when(timesheetRepository.findByWeekRangeAndStatusesWithEntries(any(), any(), any()))
                .thenReturn(List.of(sheet));
        when(userRepository.findAll()).thenReturn(List.of(collabUser));

        var projectView = new ProjectStore.ProjectView(projectId, "Mission Client", "MANUAL", "Client X", true, true, "PRJ-100", BigDecimal.valueOf(600.00));
        when(projectStore.list()).thenReturn(List.of(projectView));

        // When direction gets overview
        BillingOverview overview = service.getOverview(directionPrincipal, "2026-10", null, null);

        assertThat(overview).isNotNull();
        assertThat(overview.billableDays()).isEqualTo(3.0);
        assertThat(overview.canViewFinancials()).isTrue();
        // 3 days * 600€ = 1800.00€
        assertThat(overview.totalFinancialAmount()).isEqualByComparingTo(BigDecimal.valueOf(1800.00));

        var proj = overview.projects().getFirst();
        assertThat(proj.dailyRate()).isEqualByComparingTo(BigDecimal.valueOf(600.00));
        assertThat(proj.totalAmount()).isEqualByComparingTo(BigDecimal.valueOf(1800.00));

        var usr = overview.users().getFirst();
        assertThat(usr.totalAmount()).isEqualByComparingTo(BigDecimal.valueOf(1800.00));

        // When direction gets details
        var details = service.getDetails(directionPrincipal, "2026-10", null, null);
        assertThat(details).hasSize(3);
        for (var d : details) {
            assertThat(d.dailyRate()).isEqualByComparingTo(BigDecimal.valueOf(600.00));
            assertThat(d.totalAmount()).isEqualByComparingTo(BigDecimal.valueOf(600.00));
        }
    }

    @Test
    @DisplayName("Manager cannot query timesheets of a user outside their management scope")
    void managerCannotQueryOutsideTeam() {
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(collabUser));

        assertThatThrownBy(() -> service.getOverview(managerPrincipal, "2026-10", otherUserId, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("responsabilité managériale");
    }

    @Test
    @DisplayName("Collaborator cannot query timesheets of another user")
    void collaboratorCannotQueryAnotherUser() {
        assertThatThrownBy(() -> service.getOverview(collabPrincipal, "2026-10", otherUserId, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("propres éléments");
    }
}
