package cm.indyli.timeflow.analytics.application;

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

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;
    @Mock
    private AppUserRepository userRepository;
    @Mock
    private ProjectStore projectStore;
    @Mock
    private WorkScheduleProfileRepository workScheduleProfileRepository;

    private AnalyticsService service;

    private final UUID collabId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();
    private final UUID projectId = UUID.randomUUID();

    private TimeFlowPrincipal collabPrincipal;
    private TimeFlowPrincipal managerPrincipal;
    private TimeFlowPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(timesheetRepository, userRepository, projectStore, workScheduleProfileRepository);

        collabPrincipal = new TimeFlowPrincipal(collabId, "collab@indyli.com", "Collab User", UserRole.COLLABORATOR, AuthProvider.LOCAL);
        managerPrincipal = new TimeFlowPrincipal(managerId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL);
        adminPrincipal = new TimeFlowPrincipal(adminId, "admin@indyli.com", "Admin User", UserRole.ADMIN, AuthProvider.LOCAL);
    }

    @Test
    @DisplayName("Collaborator can access their own overview with correct TACE calculation")
    void collaboratorCanAccessOwnOverview() {
        LocalDate weekStart = LocalDate.of(2026, 10, 5); // Monday
        TimesheetEntity sheet = TimesheetEntity.draft(collabId, weekStart);
        sheet.submit();
        sheet.validate();

        // 20h billable on project + 15h internal = 35h total
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "PROJECT", LocalDate.of(2026, 10, 6), 1200, true, null));
        sheet.getEntries().add(TimeEntryEntity.create(projectId, "INTERNAL", LocalDate.of(2026, 10, 7), 900, false, null));

        when(timesheetRepository.findByUserIdsAndWeekRangeAndStatusesWithEntries(eq(Set.of(collabId)), any(), any(), any()))
                .thenReturn(List.of(sheet));

        var user = AppUserEntity.local("collab@indyli.com", "Collab User", UserRole.COLLABORATOR);
        when(userRepository.findAll()).thenReturn(List.of(user));

        var projectView = new ProjectStore.ProjectView(projectId, "Projet Client", "MANUAL", "Client A", true, true, "PROJ-1");
        when(projectStore.findById(projectId)).thenReturn(Optional.of(projectView));

        AnalyticsOverview overview = service.getOverview(collabPrincipal, "2026-10", null, null);

        assertThat(overview).isNotNull();
        assertThat(overview.totalMinutes()).isEqualTo(2100); // 35h
        assertThat(overview.billableMinutes()).isEqualTo(1200); // 20h
        assertThat(overview.internalMinutes()).isEqualTo(900); // 15h
        // TACE = (1200 * 100.0) / 2100 = 57.1%
        assertThat(overview.activityRate()).isEqualTo(57.1);
        assertThat(overview.contributorsCount()).isEqualTo(1);
        assertThat(overview.projectsBreakdown()).hasSize(1);
        assertThat(overview.projectsBreakdown().get(0).projectName()).isEqualTo("Projet Client");
        assertThat(overview.dailyTrend()).hasSize(31);
        assertThat(overview.dailyTrend().get(5).dayOfMonth()).isEqualTo(6);
        assertThat(overview.dailyTrend().get(5).totalMinutes()).isEqualTo(1200);
        assertThat(overview.dailyTrend().get(5).billableMinutes()).isEqualTo(1200);
        assertThat(overview.dailyTrend().get(6).dayOfMonth()).isEqualTo(7);
        assertThat(overview.dailyTrend().get(6).totalMinutes()).isEqualTo(900);
        assertThat(overview.dailyTrend().get(6).billableMinutes()).isEqualTo(0);
    }

    @Test
    @DisplayName("Collaborator is denied access when requesting another user's analytics")
    void collaboratorCannotAccessOtherUser() {
        assertThatThrownBy(() -> service.getOverview(collabPrincipal, "2026-10", UUID.randomUUID(), null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("ses propres analyses");
    }

    @Test
    @DisplayName("Manager can access analytics for their managed team members")
    void managerCanAccessTeamAnalytics() {
        var managedUser = AppUserEntity.local("managed@indyli.com", "Managed User", UserRole.COLLABORATOR);
        managedUser.updateAdministrativeProfile("Managed User", UserRole.COLLABORATOR, managerId, 2100);

        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(managedUser));
        when(userRepository.findAll()).thenReturn(List.of(managedUser));
        when(timesheetRepository.findByUserIdsAndWeekRangeAndStatusesWithEntries(any(), any(), any(), any()))
                .thenReturn(List.of());

        AnalyticsOverview overview = service.getOverview(managerPrincipal, "2026-10", null, null);

        assertThat(overview).isNotNull();
        assertThat(overview.totalMinutes()).isEqualTo(0);
        assertThat(overview.activityRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Manager is denied access when querying a user outside their team")
    void managerCannotAccessUnmanagedUser() {
        UUID strangerId = UUID.randomUUID();
        when(userRepository.findByManagerId(managerId)).thenReturn(List.of());

        assertThatThrownBy(() -> service.getOverview(managerPrincipal, "2026-10", strangerId, null))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("responsabilité managériale");
    }

    @Test
    @DisplayName("Admin has global company access across all users")
    void adminHasGlobalAccess() {
        when(userRepository.findAll()).thenReturn(List.of());
        when(timesheetRepository.findByWeekRangeAndStatusesWithEntries(any(), any(), any()))
                .thenReturn(List.of());

        AnalyticsOverview overview = service.getOverview(adminPrincipal, "2026-Q4", null, null);

        assertThat(overview).isNotNull();
        assertThat(overview.period()).isEqualTo("2026-Q4");
        assertThat(overview.periodLabel()).isEqualTo("Trimestre 4 2026");
    }
}
