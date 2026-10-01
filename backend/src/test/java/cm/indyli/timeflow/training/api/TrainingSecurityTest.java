package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.training.application.SaveTrainingCommand;
import cm.indyli.timeflow.training.application.TrainingKpiDto;
import cm.indyli.timeflow.training.application.TrainingService;
import cm.indyli.timeflow.training.application.TrainingSessionDto;
import cm.indyli.timeflow.training.domain.DeliveryMode;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TrainingController.class)
@Import(SecurityConfig.class)
class TrainingSecurityTest {

    private static final String TRAININGS_ENDPOINT = "/api/v1/trainings";
    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired MockMvc mvc;
    @MockitoBean TrainingService trainingService;
    @MockitoBean CurrentUserService currentUserService;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;

    private TrainingSessionDto sampleDto;

    @BeforeEach
    void setUp() {
        sampleDto = new TrainingSessionDto(
                UUID.randomUUID(),
                "TRN-TEST-01",
                "Formation Test",
                "Description",
                null,
                null,
                null,
                "En ligne",
                DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED,
                LocalDate.of(2026, 10, 15),
                LocalDate.of(2026, 10, 16),
                BigDecimal.valueOf(14.0),
                10,
                0,
                false,
                false,
                Collections.emptyList(),
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(currentUserService.resolve(any())).thenReturn(
                new TimeFlowPrincipal(USER_ID, "user@example.com", "User", UserRole.COLLABORATOR, AuthProvider.LOCAL));
        when(trainingService.listSessions(any(), any(), any(), any(), any(), any())).thenReturn(List.of(sampleDto));
        when(trainingService.getKpis()).thenReturn(new TrainingKpiDto(1, 1, 0, 0, BigDecimal.valueOf(14.0), 0));
    }

    @Test
    @DisplayName("L'accès anonyme aux formations est redirigé")
    void anonymousCannotListTrainings() throws Exception {
        mvc.perform(get(TRAININGS_ENDPOINT)).andExpect(status().is3xxRedirection());
    }

    @Test
    @DisplayName("Tout collaborateur authentifié peut lister les formations")
    void collaboratorCanListTrainings() throws Exception {
        mvc.perform(get(TRAININGS_ENDPOINT)
                .with(user("collab").roles("COLLABORATOR")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Tout formateur authentifié peut lister les formations et les KPIs")
    void trainerCanListTrainingsAndKpis() throws Exception {
        mvc.perform(get(TRAININGS_ENDPOINT + "/kpi")
                .with(user("trainer").roles("TRAINER")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("La création d'une formation requiert ADMIN ou DIRECTION et CSRF")
    void createTrainingRequiresAdminOrDirectionAndCsrf() throws Exception {
        when(trainingService.createSession(any(SaveTrainingCommand.class), any())).thenReturn(sampleDto);

        String payload = """
                {
                    "reference": "TRN-NEW-01",
                    "title": "Nouvelle Formation",
                    "description": "Objectifs pédagogiques",
                    "location": "Teams",
                    "deliveryMode": "REMOTE",
                    "category": "INTERNAL",
                    "status": "PLANNED",
                    "startDate": "2026-10-20",
                    "endDate": "2026-10-21",
                    "durationHours": 14.0,
                    "maxParticipants": 12
                }
                """;

        // Without CSRF -> 403
        mvc.perform(post(TRAININGS_ENDPOINT)
                .with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as Collaborator -> 403
        mvc.perform(post(TRAININGS_ENDPOINT)
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isForbidden());

        // With CSRF as ADMIN -> 201
        mvc.perform(post(TRAININGS_ENDPOINT)
                .with(user("admin").roles("ADMIN"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated());

        // With CSRF as DIRECTION -> 201
        mvc.perform(post(TRAININGS_ENDPOINT)
                .with(user("dir").roles("DIRECTION"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("La suppression d'une formation requiert ADMIN ou DIRECTION et CSRF")
    void deleteTrainingRequiresAdminOrDirectionAndCsrf() throws Exception {
        UUID id = UUID.randomUUID();

        // Without CSRF -> 403
        mvc.perform(delete(TRAININGS_ENDPOINT + "/" + id)
                .with(user("admin").roles("ADMIN")))
                .andExpect(status().isForbidden());

        // With CSRF as Collaborator -> 403
        mvc.perform(delete(TRAININGS_ENDPOINT + "/" + id)
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf()))
                .andExpect(status().isForbidden());

        // With CSRF as DIRECTION -> 204
        mvc.perform(delete(TRAININGS_ENDPOINT + "/" + id)
                .with(user("dir").roles("DIRECTION"))
                .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Un collaborateur peut s'inscrire lui-même avec CSRF")
    void collaboratorCanRegisterThemselves() throws Exception {
        UUID id = UUID.randomUUID();

        mvc.perform(post(TRAININGS_ENDPOINT + "/" + id + "/participants")
                .with(user("collab").roles("COLLABORATOR"))
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isCreated());
    }
}
