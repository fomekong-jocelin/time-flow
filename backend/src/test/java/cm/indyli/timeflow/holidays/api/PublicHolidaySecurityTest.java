package cm.indyli.timeflow.holidays.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.holidays.application.CreateHolidayCommand;
import cm.indyli.timeflow.holidays.application.PublicHolidayDto;
import cm.indyli.timeflow.holidays.application.PublicHolidayService;
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

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicHolidayController.class)
@Import(SecurityConfig.class)
class PublicHolidaySecurityTest {

    private static final String HOLIDAYS_ENDPOINT = "/api/v1/holidays";
    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired MockMvc mvc;
    @MockitoBean PublicHolidayService holidayService;
    @MockitoBean CurrentUserService currentUserService;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;

    private PublicHolidayDto sampleDto;

    @BeforeEach
    void setUp() {
        sampleDto = new PublicHolidayDto(UUID.randomUUID(), LocalDate.of(2026, 1, 1), "Jour de l'An", false, 2026);
        when(currentUserService.resolve(any())).thenReturn(
                new TimeFlowPrincipal(USER_ID, "user@example.com", "User", UserRole.COLLABORATOR, AuthProvider.LOCAL));
        when(holidayService.listByYear(2026)).thenReturn(List.of(sampleDto));
    }

    @Test
    @DisplayName("L'accès anonyme aux jours fériés est redirigé vers le login")
    void anonymousCannotListHolidays() throws Exception {
        mvc.perform(get(HOLIDAYS_ENDPOINT)).andExpect(status().is3xxRedirection());
    }

    @Test
    @DisplayName("Tout collaborateur authentifié peut lister les jours fériés")
    void collaboratorCanListHolidays() throws Exception {
        mvc.perform(get(HOLIDAYS_ENDPOINT)
                .param("year", "2026")
                .with(user("collab").roles("COLLABORATOR")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("La création d'un jour férié requiert les droits d'administration et CSRF")
    void createHolidayRequiresAdminAndCsrf() throws Exception {
        when(holidayService.create(any(CreateHolidayCommand.class))).thenReturn(sampleDto);

        String payload = """
                {
                    "holidayDate": "2026-07-14",
                    "name": "Fête Nationale",
                    "isWorked": false
                }
                """;

        // Without CSRF -> 403
        mvc.perform(post(HOLIDAYS_ENDPOINT)
                .with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as Collaborator -> 403
        mvc.perform(post(HOLIDAYS_ENDPOINT)
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as ADMIN -> 201
        mvc.perform(post(HOLIDAYS_ENDPOINT)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("La suppression d'un jour férié requiert les droits d'administration et CSRF")
    void deleteHolidayRequiresAdminAndCsrf() throws Exception {
        UUID id = UUID.randomUUID();

        // Without CSRF -> 403
        mvc.perform(delete(HOLIDAYS_ENDPOINT + "/" + id)
                .with(user("admin").roles("ADMIN")))
                .andExpect(status().isForbidden());

        // With CSRF as Collaborator -> 403
        mvc.perform(delete(HOLIDAYS_ENDPOINT + "/" + id)
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf()))
                .andExpect(status().isForbidden());

        // With CSRF as DIRECTION -> 204
        mvc.perform(delete(HOLIDAYS_ENDPOINT + "/" + id)
                .with(user("dir").roles("DIRECTION"))
                .with(csrf()))
                .andExpect(status().isNoContent());
    }
}
