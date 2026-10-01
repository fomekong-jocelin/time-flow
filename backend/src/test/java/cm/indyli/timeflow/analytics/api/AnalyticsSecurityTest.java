package cm.indyli.timeflow.analytics.api;

import cm.indyli.timeflow.analytics.application.AnalyticsOverview;
import cm.indyli.timeflow.analytics.application.AnalyticsService;
import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.timesheet.api.TimesheetExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AnalyticsController.class, TimesheetExceptionHandler.class})
@Import(SecurityConfig.class)
class AnalyticsSecurityTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AnalyticsService analyticsService;
    @MockitoBean
    private CurrentUserService currentUserService;
    @MockitoBean
    private EntraOidcUserService oidc;
    @MockitoBean
    private AuthProperties properties;
    @MockitoBean
    private ClientRegistrationRepository registrations;

    private final UUID userId = UUID.randomUUID();

    @Test
    void unauthenticatedCallIsRejected() throws Exception {
        mvc.perform(get("/api/v1/analytics/overview"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void authenticatedUserCanAccessAnalyticsOverview() throws Exception {
        var principal = new TimeFlowPrincipal(userId, "user@indyli.com", "Test User", UserRole.COLLABORATOR, AuthProvider.LOCAL);
        when(currentUserService.resolve(any())).thenReturn(principal);

        var overview = new AnalyticsOverview(
                "2026-10",
                "Octobre 2026",
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 31),
                2100,
                1680,
                420,
                0,
                0,
                80.0,
                1,
                1,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );
        when(analyticsService.getOverview(eq(principal), eq("2026-10"), any(), any())).thenReturn(overview);

        mvc.perform(get("/api/v1/analytics/overview")
                        .param("period", "2026-10")
                        .with(user("user@indyli.com").roles("COLLABORATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("2026-10"))
                .andExpect(jsonPath("$.activityRate").value(80.0))
                .andExpect(jsonPath("$.totalMinutes").value(2100));
    }
}
