package cm.indyli.timeflow.billing.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.billing.application.BillingExportService;
import cm.indyli.timeflow.billing.application.BillingOverview;
import cm.indyli.timeflow.billing.application.BillingService;
import cm.indyli.timeflow.billing.application.ProjectBillingItem;
import cm.indyli.timeflow.billing.application.UserBillingItem;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.timesheet.api.TimesheetExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({BillingController.class, TimesheetExceptionHandler.class})
@Import(SecurityConfig.class)
class BillingSecurityTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private BillingService billingService;
    @MockitoBean
    private BillingExportService exportService;
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
    void unauthenticatedCallIsRedirected() throws Exception {
        mvc.perform(get("/api/v1/billing/overview"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void managerCanAccessOverview_andFinancialAmountsAreNull() throws Exception {
        var principal = new TimeFlowPrincipal(userId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL);
        when(currentUserService.resolve(any())).thenReturn(principal);

        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                2100, 2100, 5.0,
                1, 1,
                false, // canViewFinancials = false
                null,
                List.of(new ProjectBillingItem(
                        UUID.randomUUID(), "Projet Alpha", "PRJ-01", "Client A",
                        2100, 2100, 5.0, null, null, 1
                )),
                List.of(new UserBillingItem(
                        UUID.randomUUID(), "Jean Dupont", "jean@example.com", "COLLABORATOR", "Standard 35h",
                        2100, 2100, 5.0, 0, null, null
                ))
        );

        when(billingService.getOverview(eq(principal), eq("2026-10"), any(), any())).thenReturn(overview);

        mvc.perform(get("/api/v1/billing/overview")
                        .param("period", "2026-10")
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("2026-10"))
                .andExpect(jsonPath("$.billableDays").value(5.0))
                .andExpect(jsonPath("$.canViewFinancials").value(false))
                .andExpect(jsonPath("$.totalFinancialAmount").doesNotExist())
                .andExpect(jsonPath("$.projects[0].dailyRate").doesNotExist())
                .andExpect(jsonPath("$.projects[0].totalAmount").doesNotExist())
                .andExpect(jsonPath("$.users[0].dailyRate").doesNotExist())
                .andExpect(jsonPath("$.users[0].totalAmount").doesNotExist());
    }

    @Test
    void directionCanAccessOverview_andFinancialAmountsArePresent() throws Exception {
        var principal = new TimeFlowPrincipal(userId, "direction@indyli.com", "Direction User", UserRole.DIRECTION, AuthProvider.LOCAL);
        when(currentUserService.resolve(any())).thenReturn(principal);

        var overview = new BillingOverview(
                "2026-10", "Octobre 2026",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31),
                2100, 2100, 5.0,
                1, 1,
                true, // canViewFinancials = true
                BigDecimal.valueOf(2500.00),
                List.of(new ProjectBillingItem(
                        UUID.randomUUID(), "Projet Alpha", "PRJ-01", "Client A",
                        2100, 2100, 5.0, BigDecimal.valueOf(500.00), BigDecimal.valueOf(2500.00), 1
                )),
                List.of(new UserBillingItem(
                        UUID.randomUUID(), "Jean Dupont", "jean@example.com", "COLLABORATOR", "Standard 35h",
                        2100, 2100, 5.0, 0, BigDecimal.valueOf(500.00), BigDecimal.valueOf(2500.00)
                ))
        );

        when(billingService.getOverview(eq(principal), eq("2026-10"), any(), any())).thenReturn(overview);

        mvc.perform(get("/api/v1/billing/overview")
                        .param("period", "2026-10")
                        .with(user("direction@indyli.com").roles("DIRECTION")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canViewFinancials").value(true))
                .andExpect(jsonPath("$.totalFinancialAmount").value(2500.00))
                .andExpect(jsonPath("$.projects[0].dailyRate").value(500.00))
                .andExpect(jsonPath("$.projects[0].totalAmount").value(2500.00));
    }

    @Test
    void exportExcelReturnsAttachment() throws Exception {
        var principal = new TimeFlowPrincipal(userId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL);
        when(currentUserService.resolve(any())).thenReturn(principal);
        when(exportService.generateExcel(any(), any())).thenReturn(new byte[]{1, 2, 3});

        mvc.perform(get("/api/v1/billing/export/excel")
                        .param("period", "2026-10")
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"facturation-2026-10.xlsx\""))
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
    }

    @Test
    void exportCsvReturnsAttachment() throws Exception {
        var principal = new TimeFlowPrincipal(userId, "manager@indyli.com", "Manager User", UserRole.MANAGER, AuthProvider.LOCAL);
        when(currentUserService.resolve(any())).thenReturn(principal);
        when(exportService.generateCsv(any(), any())).thenReturn("CSV CONTENT".getBytes());

        mvc.perform(get("/api/v1/billing/export/csv")
                        .param("period", "2026-10")
                        .with(user("manager@indyli.com").roles("MANAGER")))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"facturation-2026-10.csv\""))
                .andExpect(content().contentType("text/csv; charset=UTF-8"));
    }
}
