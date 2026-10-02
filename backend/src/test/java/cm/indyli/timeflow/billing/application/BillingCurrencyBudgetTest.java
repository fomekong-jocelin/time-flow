package cm.indyli.timeflow.billing.application;

import cm.indyli.timeflow.auth.domain.*;
import cm.indyli.timeflow.auth.persistence.*;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.persistence.*;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingCurrencyBudgetTest {
    @Mock TimesheetRepository sheets;
    @Mock AppUserRepository users;
    @Mock ProjectStore projects;
    @Mock WorkScheduleProfileRepository profiles;
    BillingService service;
    AppUserEntity user;
    final UUID projectId = UUID.randomUUID(), secondProjectId = UUID.randomUUID();
    final TimeFlowPrincipal director = new TimeFlowPrincipal(UUID.randomUUID(), "dir@example.test", "Director", UserRole.DIRECTION, AuthProvider.LOCAL);
    @BeforeEach void setup() {
        service = new BillingService(sheets, users, projects, profiles);
        user = AppUserEntity.local("user@example.test", "User", UserRole.COLLABORATOR); user.setDailyRate(new BigDecimal("500"));
        when(users.findAll()).thenReturn(List.of(user));
    }
    ProjectStore.ProjectView project(UUID id, String currency, BigDecimal rate) {
        return new ProjectStore.ProjectView(id, "Project", "MANUAL", "Client", true, true, "P-1", rate,
                new BigDecimal("100"), new BigDecimal("10000"), currency);
    }
    TimesheetEntity week(UUID owner, LocalDate monday, UUID id, int days) {
        var sheet = TimesheetEntity.draft(owner, monday);
        for (int day = 0; day < days; day++) sheet.getEntries().add(TimeEntryEntity.create(id, "PROJET", monday.plusDays(day), 420, true, "Work"));
        sheet.submit(); sheet.validate(); return sheet;
    }
    @Test void globalAndUserTotalsStaySeparatedByCurrency() {
        var sheet = week(user.getId(), LocalDate.of(2026, 10, 5), projectId, 1);
        sheet.getEntries().add(TimeEntryEntity.create(secondProjectId, "PROJET", LocalDate.of(2026, 10, 6), 420, true, "Work"));
        when(sheets.findByWeekRangeAndStatusesWithEntries(any(), any(), any())).thenReturn(List.of(sheet));
        when(projects.list()).thenReturn(List.of(project(projectId, "EUR", new BigDecimal("100")), project(secondProjectId, "USD", new BigDecimal("100"))));
        var result = service.getOverview(director, "2026-10", null, null);
        assertThat(result.totalFinancialAmount()).isNull(); assertThat(result.moneyTotals()).hasSize(2);
        assertThat(result.moneyTotals()).extracting(MoneyTotal::currency).containsExactly("EUR", "USD");
        assertThat(result.moneyTotals()).allSatisfy(value -> assertThat(value.amount()).isEqualByComparingTo("100"));
        assertThat(result.users().getFirst().totalAmount()).isNull(); assertThat(result.users().getFirst().moneyTotals()).hasSize(2);
    }
    @Test void eurReferenceRateIsNeverRelabelledAsUsd() {
        var sheet = week(user.getId(), LocalDate.of(2026, 10, 5), projectId, 1);
        when(sheets.findByWeekRangeAndStatusesWithEntries(any(), any(), any())).thenReturn(List.of(sheet));
        when(projects.list()).thenReturn(List.of(project(projectId, "USD", null)));
        var result = service.getOverview(director, "2026-10", null, null);
        assertThat(result.totalFinancialAmount()).isNull(); assertThat(result.projects().getFirst().totalAmount()).isNull();
        assertThat(result.moneyTotals().getFirst().unpricedBillableMinutes()).isEqualTo(420);
        assertThat(result.users().getFirst().dailyRateCurrency()).isEqualTo("EUR");
        var detail = service.getDetails(director, "2026-10", null, null).getFirst();
        assertThat(detail.dailyRate()).isNull(); assertThat(detail.totalAmount()).isNull(); assertThat(detail.currency()).isEqualTo("USD");
    }
    @Test void sameCurrencyFallbackStillWorks() {
        var sheet = week(user.getId(), LocalDate.of(2026, 10, 5), projectId, 1);
        when(sheets.findByWeekRangeAndStatusesWithEntries(any(), any(), any())).thenReturn(List.of(sheet));
        when(projects.list()).thenReturn(List.of(project(projectId, "EUR", null)));
        assertThat(service.getOverview(director, "2026-10", null, null).totalFinancialAmount()).isEqualByComparingTo("500");
    }
    @Test void globalBudgetUsesPreviousPeriodsAndOtherContributorsDespiteActiveFilters() {
        var current = week(user.getId(), LocalDate.of(2026, 10, 5), projectId, 5);
        var lifetime = new ArrayList<TimesheetEntity>();
        UUID anotherContributor = UUID.randomUUID();
        for (int i = 0; i < 12; i++) lifetime.add(week(anotherContributor, LocalDate.of(2026, 1, 5).plusWeeks(i), projectId, 5));
        lifetime.add(current);
        when(sheets.findByUserIdsAndWeekRangeAndStatusesWithEntries(eq(Set.of(user.getId())), any(), any(), any())).thenReturn(List.of(current));
        when(sheets.findByProjectIdsAndStatusesWithEntries(eq(Set.of(projectId)), any())).thenReturn(lifetime);
        when(projects.list()).thenReturn(List.of(project(projectId, "EUR", new BigDecimal("100"))));
        var result = service.getOverview(director, "2026-10", user.getId(), projectId).projects().getFirst();
        assertThat(result.billableDays()).isEqualTo(5); assertThat(result.remainingDays()).isEqualTo(35);
        assertThat(result.progressDaysPercent()).isEqualTo(65); assertThat(result.remainingAmount()).isEqualByComparingTo("3500");
        assertThat(result.totalAmount()).isEqualByComparingTo("500");
        verify(sheets).findByProjectIdsAndStatusesWithEntries(eq(Set.of(projectId)), any());
    }
    @Test void managerGetsNeitherMoneyTotalsNorGlobalConsumptionOutsideTheirScope() {
        UUID managerId = UUID.randomUUID();
        var principal = new TimeFlowPrincipal(managerId, "manager@example.test", "Manager", UserRole.MANAGER, AuthProvider.LOCAL);
        when(users.findByManagerId(managerId)).thenReturn(List.of(user));
        when(sheets.findByUserIdsAndWeekRangeAndStatusesWithEntries(any(), any(), any(), any())).thenReturn(List.of(week(user.getId(), LocalDate.of(2026, 10, 5), projectId, 1)));
        when(projects.list()).thenReturn(List.of(project(projectId, "EUR", new BigDecimal("100"))));
        var result = service.getOverview(principal, "2026-10", null, null);
        assertThat(result.moneyTotals()).isEmpty(); assertThat(result.totalFinancialAmount()).isNull();
        assertThat(result.users().getFirst().moneyTotals()).isEmpty(); assertThat(result.users().getFirst().dailyRateCurrency()).isNull();
        assertThat(result.projects().getFirst().remainingDays()).isNull(); assertThat(result.projects().getFirst().remainingAmount()).isNull();
        verify(sheets, never()).findByProjectIdsAndStatusesWithEntries(any(), any());
    }
}
