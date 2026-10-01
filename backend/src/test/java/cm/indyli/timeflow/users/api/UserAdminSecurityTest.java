package cm.indyli.timeflow.users.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.users.application.UserAdministrationService;
import cm.indyli.timeflow.users.application.UserDirectoryService;
import cm.indyli.timeflow.users.domain.UserAdministrationException;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserAdminController.class)
@Import(SecurityConfig.class)
class UserAdminSecurityTest {

    private static final UUID ACTOR = UUID.randomUUID();
    private static final String USERS = "/api/v1/admin/users";
    private static final String SSO_BODY =
            "{\"email\":\"dev@example.com\",\"displayName\":\"Dev\",\"role\":\"COLLABORATOR\",\"weeklyTargetMinutes\":2100}";

    @Autowired MockMvc mvc;
    @MockitoBean UserDirectoryService directory;
    @MockitoBean UserAdministrationService administration;
    @MockitoBean CurrentUserService currentUserService;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;

    @BeforeEach
    void actor() {
        when(currentUserService.resolve(any())).thenReturn(
                new TimeFlowPrincipal(ACTOR, "admin@example.com", "Admin", UserRole.ADMIN, AuthProvider.LOCAL));
    }

    @Test
    void onlyAdminCanListUsers() throws Exception {
        mvc.perform(get(USERS)).andExpect(status().is3xxRedirection());
        mvc.perform(get(USERS).with(user("manager").roles("MANAGER"))).andExpect(status().isForbidden());
        mvc.perform(get(USERS).with(user("admin").roles("ADMIN"))).andExpect(status().isOk());
        verify(directory).list();
    }

    @Test
    void ssoInvitationRequiresCsrfAndValidPayload() throws Exception {
        mvc.perform(post(USERS + "/sso").with(user("admin").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(SSO_BODY)).andExpect(status().isForbidden());
        mvc.perform(post(USERS + "/sso").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(SSO_BODY.replace("dev@example.com", "not-an-email")))
                .andExpect(status().isBadRequest());
        mvc.perform(post(USERS + "/sso").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(SSO_BODY.replace("2100", "9999")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(administration);
    }

    @Test
    void adminUpdateIsAttributedToCurrentUser() throws Exception {
        var target = UUID.randomUUID();
        mvc.perform(put(USERS + "/" + target).with(user("admin").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Dev\",\"role\":\"MANAGER\",\"managerId\":null,\"weeklyTargetMinutes\":2100}"))
                .andExpect(status().isOk());
        verify(administration).updateProfile(eq(ACTOR), eq(target), any());
    }

    @Test
    void businessRefusalIsExposedAsProblemWithStableCode() throws Exception {
        var target = UUID.randomUUID();
        doThrow(new UserAdministrationException("last_admin", "Au moins un administrateur actif doit être conservé."))
                .when(administration).changeActive(ACTOR, target, false);

        mvc.perform(put(USERS + "/" + target + "/active").with(user("admin").roles("ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("last_admin"));
    }

    @Test
    void collaboratorCannotResetPasswords() throws Exception {
        mvc.perform(post(USERS + "/" + UUID.randomUUID() + "/password").with(user("dev").roles("COLLABORATOR")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"a-strong-password-123\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(administration);
    }
}
