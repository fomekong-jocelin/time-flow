package cm.indyli.timeflow.timesheet.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.timesheet.application.ManagerTimesheetDetail;
import cm.indyli.timeflow.timesheet.application.PendingTimesheetSummary;
import cm.indyli.timeflow.timesheet.application.TimesheetOverview;
import cm.indyli.timeflow.timesheet.application.TimesheetValidationService;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({TimesheetManagerController.class, TimesheetExceptionHandler.class})
@Import(SecurityConfig.class)
class TimesheetManagerSecurityTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TimesheetValidationService validationService;
    @MockitoBean
    private CurrentUserService currentUserService;
    @MockitoBean
    private EntraOidcUserService oidc;
    @MockitoBean
    private AuthProperties properties;
    @MockitoBean
    private ClientRegistrationRepository registrations;

    private final UUID managerId = UUID.randomUUID();
    private final UUID timesheetId = UUID.randomUUID();
    private final TimeFlowPrincipal managerPrincipal = new TimeFlowPrincipal(
            managerId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL
    );

    @Test
    void anonymousCannotAccessManagerEndpoint() throws Exception {
        mvc.perform(get("/api/v1/manager/timesheets"))
                .andExpect(status().is3xxRedirection());
        verifyNoInteractions(validationService);
    }

    @Test
    void collaboratorIsForbidden() throws Exception {
        mvc.perform(get("/api/v1/manager/timesheets")
                        .with(user("collab@indyli.com").roles("COLLABORATOR")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(validationService);
    }

    @Test
    void managerCanListPending() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);
        var summary = new PendingTimesheetSummary(
                timesheetId, UUID.randomUUID(), "Jean Dupont", "jean@indyli.com",
                LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 11),
                TimesheetStatus.SUBMITTED, OffsetDateTime.now(), 2100, 2100, 2,
                false, List.of("TimeFlow"), 2100, false
        );
        when(validationService.listPending(eq(managerPrincipal), eq(TimesheetStatus.SUBMITTED), any(), any(), any(), any(), any()))
                .thenReturn(List.of(summary));

        mvc.perform(get("/api/v1/manager/timesheets")
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userDisplayName").value("Jean Dupont"))
                .andExpect(jsonPath("$[0].status").value("SUBMITTED"));
    }

    @Test
    void managerCanListSubordinates() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);
        var sub = new cm.indyli.timeflow.timesheet.application.SubordinateSummary(
                UUID.randomUUID(), "Alice Martin", "alice@indyli.com", "COLLABORATOR"
        );
        when(validationService.getManagedUsers(managerPrincipal)).thenReturn(List.of(sub));

        mvc.perform(get("/api/v1/manager/timesheets/subordinates")
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].displayName").value("Alice Martin"))
                .andExpect(jsonPath("$[0].email").value("alice@indyli.com"));
    }

    @Test
    void managerCanFilterWithUserIdAndProjectId() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);
        UUID targetUserId = UUID.randomUUID();
        UUID targetProjectId = UUID.randomUUID();

        when(validationService.listPending(eq(managerPrincipal), eq(TimesheetStatus.VALIDATED), any(), eq(targetUserId), eq(targetProjectId), any(), any()))
                .thenReturn(List.of());

        mvc.perform(get("/api/v1/manager/timesheets")
                        .param("status", "VALIDATED")
                        .param("userId", targetUserId.toString())
                        .param("projectId", targetProjectId.toString())
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk());

        verify(validationService).listPending(eq(managerPrincipal), eq(TimesheetStatus.VALIDATED), any(), eq(targetUserId), eq(targetProjectId), any(), any());
    }

    @Test
    void validateRequiresCsrf() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);

        mvc.perform(post("/api/v1/manager/timesheets/" + timesheetId + "/validate")
                        .with(user("manager@indyli.com").roles("MANAGER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(validationService);
    }

    @Test
    void validateWithCsrfSucceeds() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);
        var detail = new ManagerTimesheetDetail(
                timesheetId, UUID.randomUUID(), "Jean Dupont", "jean@indyli.com",
                new TimesheetOverview(timesheetId, UUID.randomUUID(), LocalDate.of(2026, 10, 5),
                        LocalDate.of(2026, 10, 11), TimesheetStatus.VALIDATED, null, null, null,
                        2100, 2100, 2100, 0, Map.of(), List.of(), null, false),
                List.of()
        );
        when(validationService.validate(eq(managerPrincipal), eq(timesheetId), any())).thenReturn(detail);

        mvc.perform(post("/api/v1/manager/timesheets/" + timesheetId + "/validate")
                        .with(user("manager@indyli.com").roles("MANAGER"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"Validé\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userDisplayName").value("Jean Dupont"));

        verify(validationService).validate(eq(managerPrincipal), eq(timesheetId), eq("Validé"));
    }

    @Test
    void rejectRequiresNonBlankComment() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(managerPrincipal);

        mvc.perform(post("/api/v1/manager/timesheets/" + timesheetId + "/reject")
                        .with(user("manager@indyli.com").roles("MANAGER"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(validationService);
    }
}
