package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.*;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.*;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.training.application.TrainingParticipantCorrectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TrainingParticipantCorrectionController.class)
@Import(SecurityConfig.class)
class TrainingParticipantCorrectionSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean TrainingParticipantCorrectionService corrections;
    @MockitoBean CurrentUserService currentUser;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;
    final String endpoint = "/api/v1/trainings/" + UUID.randomUUID() + "/participants/" + UUID.randomUUID() + "/corrections";
    final String body = "{\"expectedStatus\":\"ATTENDED\",\"status\":\"CANCELLED\",\"reason\":\"Presence entered in error\"}";
    @BeforeEach void setup() {
        when(currentUser.resolve(any())).thenReturn(new TimeFlowPrincipal(UUID.randomUUID(), "admin@example.test", "Admin", UserRole.ADMIN, AuthProvider.LOCAL));
    }
    @Test void requiresAdminOrDirection() throws Exception {
        for (String role : new String[]{"TRAINER", "MANAGER", "COLLABORATOR"}) {
            mvc.perform(post(endpoint).with(user("user").roles(role)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(corrections);
    }
    @Test void csrfCannotBeBypassedByAdministrator() throws Exception {
        mvc.perform(post(endpoint).with(user("admin").roles("ADMIN")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        verifyNoInteractions(corrections);
    }
    @Test void acceptsValidatedCorrectionForAdminAndDirection() throws Exception {
        for (String role : new String[]{"ADMIN", "DIRECTION"}) {
            mvc.perform(post(endpoint).with(user("admin").roles(role)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isNoContent());
        }
        verify(corrections, times(2)).correct(any(), any(), any(), any());
    }
    @Test void reasonAndExpectedStatusAreRequired() throws Exception {
        for (String invalid : new String[]{"{}", "{\"expectedStatus\":\"ATTENDED\",\"status\":\"CANCELLED\",\"reason\":\"  \"}"}) {
            mvc.perform(post(endpoint).with(user("admin").roles("ADMIN")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(corrections);
    }
}
