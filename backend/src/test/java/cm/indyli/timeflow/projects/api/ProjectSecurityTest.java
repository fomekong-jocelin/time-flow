package cm.indyli.timeflow.projects.api;

import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.projects.application.ProjectService;
import cm.indyli.timeflow.projects.application.ProjectExcelService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({ProjectController.class, ProjectExcelController.class})
@Import(SecurityConfig.class)
class ProjectSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean ProjectService service;
    @MockitoBean ProjectExcelService excel;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;
    private static final String SYNC = "/api/v1/admin/integrations/azure/projects/sync";

    @Test
    void anonymousCannotReadCatalogue() throws Exception {
        mvc.perform(get("/api/v1/projects")).andExpect(status().is3xxRedirection());
        verifyNoInteractions(service);
    }

    @Test
    void collaboratorCanReadButCannotSynchronize() throws Exception {
        mvc.perform(get("/api/v1/projects").with(user("collaborator").roles("COLLABORATOR"))).andExpect(status().isOk());
        mvc.perform(post(SYNC).with(user("collaborator").roles("COLLABORATOR")).with(csrf())).andExpect(status().isForbidden());
        verify(service, never()).synchronize();
    }

    @Test
    void adminStillNeedsCsrf() throws Exception {
        mvc.perform(post(SYNC).with(user("admin").roles("ADMIN"))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void adminWithCsrfCanSynchronize() throws Exception {
        mvc.perform(post(SYNC).with(user("admin").roles("ADMIN")).with(csrf())).andExpect(status().isOk());
        verify(service).synchronize();
    }

    @Test
    void excelImportRequiresAdminAndCsrf() throws Exception {
        String path = "/api/v1/admin/projects/excel/import";
        mvc.perform(multipart(path).file("file", new byte[]{1}).with(user("collaborator").roles("COLLABORATOR")).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(multipart(path).file("file", new byte[]{1}).with(user("admin").roles("ADMIN")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(excel);
        mvc.perform(multipart(path).file("file", new byte[]{1}).with(user("admin").roles("ADMIN")).with(csrf()))
                .andExpect(status().isOk());
        verify(excel).importWorkbook(any());
    }

    @Test
    void excelDownloadRequiresAdminAndReturnsAttachment() throws Exception {
        String path = "/api/v1/admin/projects/excel/template";
        mvc.perform(get(path).with(user("collaborator").roles("COLLABORATOR"))).andExpect(status().isForbidden());
        when(excel.template()).thenReturn(new byte[]{1});
        mvc.perform(get(path).with(user("admin").roles("ADMIN"))).andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"modele-projets-timeflow.xlsx\""))
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    void collaboratorCannotCreateOrUpdateProject() throws Exception {
        String body = """
                {
                    "name": "Nouveau Projet",
                    "active": true,
                    "billableDefault": true,
                    "dailyRate": 650.00,
                    "budgetDays": 50.0,
                    "totalPrice": 32500.00,
                    "currency": "XAF"
                }
                """;
        mvc.perform(post("/api/v1/admin/projects")
                        .contentType("application/json")
                        .content(body)
                        .with(user("collaborator").roles("COLLABORATOR"))
                        .with(csrf()))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/v1/admin/projects/" + java.util.UUID.randomUUID())
                        .contentType("application/json")
                        .content(body)
                        .with(user("collaborator").roles("COLLABORATOR"))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAndDirectionCanCreateProjectWithCsrf() throws Exception {
        String body = """
                {
                    "name": "Projet Forfait",
                    "active": true,
                    "billableDefault": true,
                    "dailyRate": 700.00,
                    "budgetDays": 40.0,
                    "totalPrice": 28000.00,
                    "currency": "USD"
                }
                """;
        // Direction
        mvc.perform(post("/api/v1/admin/projects")
                        .contentType("application/json")
                        .content(body)
                        .with(user("direction").roles("DIRECTION"))
                        .with(csrf()))
                .andExpect(status().isCreated());
        verify(service).create(any());

        // Admin
        mvc.perform(post("/api/v1/admin/projects")
                        .contentType("application/json")
                        .content(body)
                        .with(user("admin").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isCreated());
    }

    @Test
    void listMasksFinancialsForCollaborator() throws Exception {
        mvc.perform(get("/api/v1/projects").with(user("collab").roles("COLLABORATOR"))).andExpect(status().isOk());
        verify(service).list(false);

        mvc.perform(get("/api/v1/projects").with(user("dir").roles("DIRECTION"))).andExpect(status().isOk());
        verify(service).list(true);

        mvc.perform(get("/api/v1/projects").with(user("adm").roles("ADMIN"))).andExpect(status().isOk());
        verify(service, times(2)).list(true);
    }
}
