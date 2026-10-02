package cm.indyli.timeflow.billing.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.billing.domain.BillingPeriod;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BillingService {
    private static final int MINUTES_PER_DAY = 420;
    private static final Set<TimesheetStatus> APPROVED = Set.of(TimesheetStatus.VALIDATED, TimesheetStatus.LOCKED);
    // Legacy user rates were expressed in EUR; never relabel them as another project's currency.
    private static final String USER_RATE_CURRENCY = "EUR";
    private final TimesheetRepository sheets;
    private final AppUserRepository users;
    private final ProjectStore projects;
    private final WorkScheduleProfileRepository schedules;

    public BillingService(TimesheetRepository sheets, AppUserRepository users, ProjectStore projects,
                          WorkScheduleProfileRepository schedules) {
        this.sheets = sheets; this.users = users; this.projects = projects; this.schedules = schedules;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('COLLABORATOR', 'TRAINER', 'MANAGER', 'DIRECTION', 'ADMIN')")
    public BillingOverview getOverview(TimeFlowPrincipal principal, String periodStr, UUID targetUserId, UUID targetProjectId) {
        BillingPeriod period = BillingPeriod.parse(periodStr);
        boolean financials = financials(principal);
        List<TimesheetEntity> selected = fetchTimesheets(period, resolveUserScope(principal, targetUserId));
        Map<UUID, AppUserEntity> userMap = users.findAll().stream().collect(Collectors.toMap(AppUserEntity::getId, u -> u));
        Map<UUID, ProjectStore.ProjectView> projectMap = projects.list().stream().collect(Collectors.toMap(ProjectStore.ProjectView::id, p -> p));
        Map<UUID, String> profileNames = schedules.findAll().stream().collect(Collectors.toMap(WorkScheduleProfileEntity::getId, WorkScheduleProfileEntity::getName));
        Map<UUID, Accumulator> projectAcc = new HashMap<>(), userAcc = new HashMap<>();
        MoneyTotals totalMoney = new MoneyTotals();
        int totalMinutes = 0, billableMinutes = 0;
        for (var sheet : selected) {
            int selectedSheetMinutes = 0;
            for (var entry : sheet.getEntries()) {
                if (!included(entry, period, targetProjectId)) continue;
                int minutes = entry.getMinutes();
                selectedSheetMinutes += minutes; totalMinutes += minutes;
                if (entry.isBillable()) billableMinutes += minutes;
                var project = projectMap.get(entry.getProjectId());
                String currency = currency(project);
                BigDecimal amount = financials ? amount(entry, rate(project, userMap.get(sheet.getUserId()))) : null;
                int unpriced = entry.isBillable() && amount == null ? minutes : 0;
                var p = projectAcc.computeIfAbsent(entry.getProjectId(), key -> new Accumulator());
                var u = userAcc.computeIfAbsent(sheet.getUserId(), key -> new Accumulator());
                p.add(entry, sheet.getUserId(), currency, amount, unpriced, financials);
                u.add(entry, sheet.getUserId(), currency, amount, unpriced, financials);
                if (financials && entry.isBillable()) totalMoney.add(currency, amount, unpriced);
            }
            var user = userMap.get(sheet.getUserId());
            int target = user == null ? AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES : user.getWeeklyTargetMinutes();
            if (selectedSheetMinutes > target) userAcc.get(sheet.getUserId()).overtime += selectedSheetMinutes - target;
        }
        // Do not disclose global consumption to roles with only a team/personal timesheet scope.
        Map<UUID, Accumulator> lifetime = financials ? lifetimeConsumption(projectAcc.keySet(), projectMap, userMap) : Map.of();
        List<ProjectBillingItem> projectItems = projectAcc.entrySet().stream().map(item -> {
            UUID id = item.getKey(); Accumulator acc = item.getValue(); var project = projectMap.get(id);
            BigDecimal budget = project == null ? null : project.budgetDays();
            BigDecimal price = financials && project != null ? project.totalPrice() : null;
            Accumulator consumed = lifetime.getOrDefault(id, new Accumulator());
            double days = roundDays(consumed.billableMinutes);
            BigDecimal cumulativeAmount = consumed.money.singleCompleteAmount();
            Double remainingDays = financials && positive(budget) ? round(budget.doubleValue() - days, 100) : null;
            Double progressDays = financials && positive(budget) ? round(days / budget.doubleValue() * 100, 10) : null;
            BigDecimal remainingAmount = positive(price) && cumulativeAmount != null ? price.subtract(cumulativeAmount) : null;
            Double progressAmount = positive(price) && cumulativeAmount != null
                    ? round(cumulativeAmount.doubleValue() / price.doubleValue() * 100, 10) : null;
            return new ProjectBillingItem(id, project == null ? "Projet inconnu" : project.name(),
                    project == null ? null : project.reference(), project == null ? null : project.organization(),
                    acc.totalMinutes, acc.billableMinutes, roundDays(acc.billableMinutes),
                    financials && project != null ? project.dailyRate() : null,
                    financials ? acc.money.singleCompleteAmount() : null, acc.contributors.size(), currency(project),
                    budget, price, remainingDays, progressDays, remainingAmount, progressAmount);
        }).sorted(Comparator.comparingInt(ProjectBillingItem::billableMinutes).reversed()).toList();
        List<UserBillingItem> userItems = userAcc.entrySet().stream().map(item -> {
            var user = userMap.get(item.getKey()); var acc = item.getValue();
            String profile = user != null && user.getWorkScheduleProfileId() != null
                    ? profileNames.getOrDefault(user.getWorkScheduleProfileId(), "Standard 35h") : "Standard 35h";
            return new UserBillingItem(item.getKey(), user == null ? "Utilisateur" : user.getDisplayName(),
                    user == null ? "" : user.getEmail(), user == null ? "" : user.getRole().name(), profile,
                    acc.totalMinutes, acc.billableMinutes, roundDays(acc.billableMinutes), acc.overtime,
                    financials && user != null ? user.getDailyRate() : null,
                    financials ? acc.money.singleCompleteAmount() : null,
                    financials ? USER_RATE_CURRENCY : null,
                    financials ? acc.money.items() : List.of());
        }).sorted(Comparator.comparingInt(UserBillingItem::billableMinutes).reversed()).toList();
        return new BillingOverview(period.rawPeriod(), period.label(), period.startDate(), period.endDate(),
                totalMinutes, billableMinutes, roundDays(billableMinutes), projectItems.size(), userItems.size(), financials,
                financials ? totalMoney.singleCompleteAmount() : null, projectItems, userItems,
                financials ? totalMoney.items() : List.of());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('COLLABORATOR', 'TRAINER', 'MANAGER', 'DIRECTION', 'ADMIN')")
    public List<BillingDetailItem> getDetails(TimeFlowPrincipal principal, String periodStr, UUID targetUserId, UUID targetProjectId) {
        BillingPeriod period = BillingPeriod.parse(periodStr);
        boolean financials = financials(principal);
        List<TimesheetEntity> selected = fetchTimesheets(period, resolveUserScope(principal, targetUserId));
        var userMap = users.findAll().stream().collect(Collectors.toMap(AppUserEntity::getId, u -> u));
        var projectMap = projects.list().stream().collect(Collectors.toMap(ProjectStore.ProjectView::id, p -> p));
        List<BillingDetailItem> details = new ArrayList<>();
        for (var sheet : selected) {
            var user = userMap.get(sheet.getUserId());
            for (var entry : sheet.getEntries()) {
                if (!included(entry, period, targetProjectId)) continue;
                var project = projectMap.get(entry.getProjectId());
                BigDecimal rate = financials ? rate(project, user) : null;
                details.add(new BillingDetailItem(entry.getEntryDate(), sheet.getUserId(), user == null ? "Utilisateur" : user.getDisplayName(),
                        entry.getProjectId(), project == null ? "Projet inconnu" : project.name(), entry.getActivityType(),
                        entry.getMinutes(), entry.isBillable(), roundDays(entry.isBillable() ? entry.getMinutes() : 0),
                        rate, financials ? amount(entry, rate) : null, entry.getComment(), currency(project)));
            }
        }
        details.sort(Comparator.comparing(BillingDetailItem::entryDate).reversed().thenComparing(BillingDetailItem::userDisplayName));
        return details;
    }
    private Map<UUID, Accumulator> lifetimeConsumption(Set<UUID> ids, Map<UUID, ProjectStore.ProjectView> projectMap,
                                                      Map<UUID, AppUserEntity> userMap) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, Accumulator> result = new HashMap<>();
        for (var sheet : sheets.findByProjectIdsAndStatusesWithEntries(ids, APPROVED)) {
            for (var entry : sheet.getEntries()) {
                if (!ids.contains(entry.getProjectId())) continue;
                var project = projectMap.get(entry.getProjectId());
                BigDecimal amount = amount(entry, rate(project, userMap.get(sheet.getUserId())));
                int unpriced = entry.isBillable() && amount == null ? entry.getMinutes() : 0;
                result.computeIfAbsent(entry.getProjectId(), key -> new Accumulator())
                        .add(entry, sheet.getUserId(), currency(project), amount, unpriced, true);
            }
        }
        return result;
    }
    private List<TimesheetEntity> fetchTimesheets(BillingPeriod period, Set<UUID> targetUsers) {
        if (targetUsers == null) return sheets.findByWeekRangeAndStatusesWithEntries(period.startWeek(), period.endWeek(), APPROVED);
        if (targetUsers.isEmpty()) return List.of();
        return sheets.findByUserIdsAndWeekRangeAndStatusesWithEntries(targetUsers, period.startWeek(), period.endWeek(), APPROVED);
    }
    private boolean included(TimeEntryEntity entry, BillingPeriod period, UUID projectId) {
        LocalDate date = entry.getEntryDate();
        return !date.isBefore(period.startDate()) && !date.isAfter(period.endDate())
                && (projectId == null || projectId.equals(entry.getProjectId()));
    }
    private BigDecimal rate(ProjectStore.ProjectView project, AppUserEntity user) {
        if (project != null && positive(project.dailyRate())) return project.dailyRate();
        if (user != null && positive(user.getDailyRate()) && currency(project).equals(USER_RATE_CURRENCY)) return user.getDailyRate();
        return null;
    }
    private BigDecimal amount(TimeEntryEntity entry, BigDecimal dailyRate) {
        if (!entry.isBillable()) return BigDecimal.ZERO.setScale(2);
        return dailyRate == null ? null : dailyRate.multiply(BigDecimal.valueOf(entry.getMinutes()))
                .divide(BigDecimal.valueOf(MINUTES_PER_DAY), 2, RoundingMode.HALF_UP);
    }
    private String currency(ProjectStore.ProjectView project) { return MoneyTotals.normalize(project == null ? null : project.currency()); }
    private boolean positive(BigDecimal value) { return value != null && value.signum() > 0; }
    private double roundDays(int minutes) { return round(minutes / (double) MINUTES_PER_DAY, 100); }
    private double round(double value, int factor) { return Math.round(value * factor) / (double) factor; }
    private boolean financials(TimeFlowPrincipal principal) { return principal.role() == UserRole.ADMIN || principal.role() == UserRole.DIRECTION; }
    private Set<UUID> resolveUserScope(TimeFlowPrincipal principal, UUID targetUserId) {
        if (principal.role() == UserRole.COLLABORATOR || principal.role() == UserRole.TRAINER) {
            if (targetUserId != null && !targetUserId.equals(principal.userId())) throw new AccessDeniedException("Un collaborateur ne peut consulter que ses propres éléments.");
            return Set.of(principal.userId());
        }
        if (principal.role() == UserRole.MANAGER) {
            Set<UUID> allowed = new HashSet<>(); allowed.add(principal.userId());
            users.findByManagerId(principal.userId()).forEach(user -> allowed.add(user.getId()));
            if (targetUserId != null && !allowed.contains(targetUserId)) throw new AccessDeniedException("Cet utilisateur n'est pas sous votre responsabilité managériale.");
            return targetUserId == null ? allowed : Set.of(targetUserId);
        }
        if (!financials(principal)) throw new AccessDeniedException("Accès refusé.");
        return targetUserId == null ? null : Set.of(targetUserId);
    }
    private static final class Accumulator {
        int totalMinutes, billableMinutes, overtime;
        final Set<UUID> contributors = new HashSet<>(); final MoneyTotals money = new MoneyTotals();
        void add(TimeEntryEntity entry, UUID userId, String currency, BigDecimal amount, int unpriced, boolean financials) {
            totalMinutes += entry.getMinutes(); contributors.add(userId);
            if (entry.isBillable()) {
                billableMinutes += entry.getMinutes();
                if (financials) money.add(currency, amount, unpriced);
            }
        }
    }
}
