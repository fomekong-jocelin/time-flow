package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatusException;
import cm.indyli.timeflow.timesheet.domain.TimesheetValidationException;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import cm.indyli.timeflow.timesheet.persistence.TimesheetValidationEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetValidationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimesheetValidationServiceTest {

    @Mock
    private TimesheetRepository timesheetRepository;
    @Mock
    private TimesheetValidationRepository validationRepository;
    @Mock
    private AppUserRepository userRepository;
    @Mock
    private TimesheetService timesheetService;
    @Mock
    private cm.indyli.timeflow.projects.infrastructure.ProjectStore projectStore;

    private TimesheetValidationService service;

    private final UUID managerId = UUID.randomUUID();
    private final UUID collaboratorId = UUID.randomUUID();
    private final LocalDate monday = LocalDate.of(2026, 10, 5);

    private final TimeFlowPrincipal managerPrincipal = new TimeFlowPrincipal(
            managerId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL
    );
    private final TimeFlowPrincipal adminPrincipal = new TimeFlowPrincipal(
            UUID.randomUUID(), "admin@indyli.com", "Admin User", UserRole.ADMIN, AuthProvider.LOCAL
    );

    @BeforeEach
    void setUp() {
        service = new TimesheetValidationService(timesheetRepository, validationRepository, userRepository, timesheetService, projectStore);
    }

    @Test
    void listPending_filtersByManagedTeamForManager() {
        var collab = AppUserEntity.local("collab@indyli.com", "Collab User", UserRole.COLLABORATOR);
        collab.updateAdministrativeProfile("Collab User", UserRole.COLLABORATOR, managerId, 2100);

        when(userRepository.findByManagerId(managerId)).thenReturn(List.of(collab));

        var sheet = TimesheetEntity.draft(collab.getId(), monday);
        sheet.submit();
        when(timesheetRepository.findByUserIdsAndStatusWithEntries(any(), eq(TimesheetStatus.SUBMITTED)))
                .thenReturn(List.of(sheet));
        when(userRepository.findAll()).thenReturn(List.of(collab));

        var result = service.listPending(managerPrincipal, TimesheetStatus.SUBMITTED, null);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().userDisplayName()).isEqualTo("Collab User");
        assertThat(result.getFirst().status()).isEqualTo(TimesheetStatus.SUBMITTED);
    }

    @Test
    void validate_transitionsToValidatedAndRecordsDecision() {
        var collab = AppUserEntity.local("collab@indyli.com", "Collab User", UserRole.COLLABORATOR);
        collab.updateAdministrativeProfile("Collab User", UserRole.COLLABORATOR, managerId, 2100);

        var sheet = TimesheetEntity.draft(collab.getId(), monday);
        sheet.submit();

        when(timesheetRepository.findByIdWithEntries(sheet.getId())).thenReturn(Optional.of(sheet));
        when(userRepository.findById(collab.getId())).thenReturn(Optional.of(collab));

        var overview = new TimesheetOverview(
                sheet.getId(), collab.getId(), monday, monday.plusDays(6), TimesheetStatus.VALIDATED,
                null, null, null, 2100, 420, 420, 0, Map.of(), List.of(), null, false
        );
        when(timesheetService.mapToOverview(any(), anyInt(), any())).thenReturn(overview);

        var detail = service.validate(managerPrincipal, sheet.getId(), "Parfait !");

        assertThat(sheet.getStatus()).isEqualTo(TimesheetStatus.VALIDATED);
        assertThat(sheet.getValidatedAt()).isNotNull();
        verify(validationRepository).save(any(TimesheetValidationEntity.class));
        assertThat(detail.userDisplayName()).isEqualTo("Collab User");
    }

    @Test
    void validate_rejectsSelfValidation() {
        var managerUser = AppUserEntity.local("manager@indyli.com", "Manager User", UserRole.MANAGER);
        var sheet = TimesheetEntity.draft(managerUser.getId(), monday);
        sheet.submit();

        var selfPrincipal = new TimeFlowPrincipal(
                managerUser.getId(), "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL
        );

        when(timesheetRepository.findByIdWithEntries(sheet.getId())).thenReturn(Optional.of(sheet));
        when(userRepository.findById(managerUser.getId())).thenReturn(Optional.of(managerUser));

        assertThatThrownBy(() -> service.validate(selfPrincipal, sheet.getId(), null))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("sa propre feuille");
    }

    @Test
    void reject_transitionsToRejectedAndRequiresComment() {
        var collab = AppUserEntity.local("collab@indyli.com", "Collab User", UserRole.COLLABORATOR);
        collab.updateAdministrativeProfile("Collab User", UserRole.COLLABORATOR, managerId, 2100);

        var sheet = TimesheetEntity.draft(collab.getId(), monday);
        sheet.submit();

        when(timesheetRepository.findByIdWithEntries(sheet.getId())).thenReturn(Optional.of(sheet));
        when(userRepository.findById(collab.getId())).thenReturn(Optional.of(collab));

        var overview = new TimesheetOverview(
                sheet.getId(), collab.getId(), monday, monday.plusDays(6), TimesheetStatus.REJECTED,
                null, null, null, 2100, 420, 420, 0, Map.of(), List.of(), null, true
        );
        when(timesheetService.mapToOverview(any(), anyInt(), any())).thenReturn(overview);

        var detail = service.reject(managerPrincipal, sheet.getId(), "Merci de ventiler les heures du mardi.");

        assertThat(sheet.getStatus()).isEqualTo(TimesheetStatus.REJECTED);
        verify(validationRepository).save(any(TimesheetValidationEntity.class));
    }
}
