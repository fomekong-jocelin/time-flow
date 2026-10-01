package cm.indyli.timeflow.workschedule.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.workschedule.application.CreateWorkScheduleCommand;
import cm.indyli.timeflow.workschedule.application.WorkScheduleService;
import cm.indyli.timeflow.workschedule.application.WorkScheduleSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({WorkScheduleAdminController.class, WorkScheduleUserController.class})
@Import(SecurityConfig.class)
class WorkScheduleSecurityTest {

    private static final String ADMIN_SCHEDULES = "/api/v1/admin/work-schedules";
    private static final String USER_ME_SCHEDULE = "/api/v1/work-schedules/me";
    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired MockMvc mvc;
    @MockitoBean WorkScheduleService workScheduleService;
    @MockitoBean CurrentUserService currentUserService;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;

    private WorkScheduleSummary sampleSummary;

    @BeforeEach
    void setUp() {
        sampleSummary = new WorkScheduleSummary(
                UUID.randomUUID(), "STD", "Standard", "Desc",
                2100, 420, 600, 2880,
                List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"),
                false, true, true, 5,
                OffsetDateTime.now(), OffsetDateTime.now()
        );

        when(currentUserService.resolve(any())).thenReturn(
                new TimeFlowPrincipal(USER_ID, "user@example.com", "User", UserRole.COLLABORATOR, AuthProvider.LOCAL));
        when(workScheduleService.listAll(true)).thenReturn(List.of(sampleSummary));
        when(workScheduleService.getForUser(any())).thenReturn(sampleSummary);
    }

    @Test
    @DisplayName("L'accès admin aux horaires est interdit aux anonymes et collaborateurs")
    void adminEndpointsAreRestricted() throws Exception {
        mvc.perform(get(ADMIN_SCHEDULES)).andExpect(status().is3xxRedirection());
        mvc.perform(get(ADMIN_SCHEDULES).with(user("collab").roles("COLLABORATOR"))).andExpect(status().isForbidden());
        mvc.perform(get(ADMIN_SCHEDULES).with(user("manager").roles("MANAGER"))).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("L'accès admin aux horaires est autorisé aux ADMIN et DIRECTION")
    void adminEndpointsAllowedForAdminAndDirection() throws Exception {
        mvc.perform(get(ADMIN_SCHEDULES).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        mvc.perform(get(ADMIN_SCHEDULES).with(user("dir").roles("DIRECTION"))).andExpect(status().isOk());
    }

    @Test
    @DisplayName("La création d'un profil nécessite les droits d'administration et CSRF")
    void createProfileRequiresCsrfAndAdmin() throws Exception {
        when(workScheduleService.create(any(CreateWorkScheduleCommand.class))).thenReturn(sampleSummary);

        String payload = """
                {
                    "code": "CUSTOM_32H",
                    "name": "Temps partiel 32h",
                    "description": "4 jours",
                    "weeklyTargetMinutes": 1920,
                    "dailyTargetMinutes": 480,
                    "maxDailyMinutes": 600,
                    "maxWeeklyMinutes": 2400,
                    "workingDays": ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"],
                    "allowWeekendEntry": false,
                    "isDefault": false
                }
                """;

        // Without CSRF -> 403
        mvc.perform(post(ADMIN_SCHEDULES)
                .with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as Collaborator -> 403
        mvc.perform(post(ADMIN_SCHEDULES)
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as ADMIN -> 201
        mvc.perform(post(ADMIN_SCHEDULES)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Tout collaborateur authentifié peut consulter sa propre configuration de temps")
    void anyAuthenticatedUserCanAccessTheirSchedule() throws Exception {
        mvc.perform(get(USER_ME_SCHEDULE)).andExpect(status().is3xxRedirection());

        mvc.perform(get(USER_ME_SCHEDULE).with(user("collab").roles("COLLABORATOR")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/users/me/work-schedule").with(user("collab").roles("COLLABORATOR")))
                .andExpect(status().isOk());
    }
}
