package cm.indyli.timeflow.timesheet.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.timesheet.application.TimesheetOverview;
import cm.indyli.timeflow.timesheet.application.TimesheetService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({TimesheetController.class, TimesheetExceptionHandler.class})
@Import(SecurityConfig.class)
class TimesheetSecurityTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private TimesheetService timesheetService;
    @MockitoBean
    private CurrentUserService currentUserService;
    @MockitoBean
    private EntraOidcUserService oidc;
    @MockitoBean
    private AuthProperties properties;
    @MockitoBean
    private ClientRegistrationRepository registrations;

    private final UUID userId = UUID.randomUUID();
    private final LocalDate monday = LocalDate.of(2026, 10, 5);
    private final TimeFlowPrincipal principal = new TimeFlowPrincipal(
            userId, "collab@indyli.com", "Collab User", UserRole.COLLABORATOR, AuthProvider.LOCAL
    );

    @Test
    void anonymousCannotAccessTimesheet() throws Exception {
        mvc.perform(get("/api/v1/timesheets"))
                .andExpect(status().is3xxRedirection());
        verifyNoInteractions(timesheetService);
    }

    @Test
    void authenticatedUserCanReadTimesheet() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(principal);
        var overview = new TimesheetOverview(
                null, userId, monday, monday.plusDays(6), TimesheetStatus.DRAFT,
                null, null, null, 2100, 0, 0, 0, Map.of(), List.of(), null, true
        );
        when(timesheetService.getTimesheet(eq(userId), eq(monday))).thenReturn(overview);

        mvc.perform(get("/api/v1/timesheets?weekStart=2026-10-05")
                        .with(user("collab@indyli.com").roles("COLLABORATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.weeklyTargetMinutes").value(2100));

        verify(timesheetService).getTimesheet(eq(userId), eq(monday));
    }

    @Test
    void saveDraftRequiresCsrf() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(principal);

        mvc.perform(put("/api/v1/timesheets/2026-10-05")
                        .with(user("collab@indyli.com").roles("COLLABORATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lines\":[]}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(timesheetService);
    }

    @Test
    void saveDraftWithCsrfSucceeds() throws Exception {
        when(currentUserService.resolve(any())).thenReturn(principal);
        var overview = new TimesheetOverview(
                UUID.randomUUID(), userId, monday, monday.plusDays(6), TimesheetStatus.DRAFT,
                null, null, null, 2100, 420, 420, 0, Map.of(), List.of(), null, true
        );
        when(timesheetService.saveDraft(eq(userId), eq(monday), any())).thenReturn(overview);

        mvc.perform(put("/api/v1/timesheets/2026-10-05")
                        .with(user("collab@indyli.com").roles("COLLABORATOR"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"lines\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        verify(timesheetService).saveDraft(eq(userId), eq(monday), any());
    }
}
