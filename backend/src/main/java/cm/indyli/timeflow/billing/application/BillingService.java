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

    private static final int MINUTES_PER_DAY = 420; // 7h standard work day

    private final TimesheetRepository timesheetRepository;
    private final AppUserRepository userRepository;
    private final ProjectStore projectStore;
    private final WorkScheduleProfileRepository workScheduleProfileRepository;

    public BillingService(TimesheetRepository timesheetRepository,
                          AppUserRepository userRepository,
                          ProjectStore projectStore,
                          WorkScheduleProfileRepository workScheduleProfileRepository) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.projectStore = projectStore;
        this.workScheduleProfileRepository = workScheduleProfileRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('COLLABORATOR', 'TRAINER', 'MANAGER', 'DIRECTION', 'ADMIN')")
    public BillingOverview getOverview(TimeFlowPrincipal principal, String periodStr, UUID targetUserId, UUID targetProjectId) {
        BillingPeriod period = BillingPeriod.parse(periodStr);
        boolean canViewFinancials = principal.role() == UserRole.DIRECTION || principal.role() == UserRole.ADMIN;
        Set<UUID> targetUserIds = resolveUserScope(principal, targetUserId);

        List<TimesheetEntity> sheets = fetchTimesheets(period, targetUserIds);

        Map<UUID, AppUserEntity> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, u -> u));
        Map<UUID, ProjectStore.ProjectView> projectMap = projectStore.list().stream()
                .collect(Collectors.toMap(ProjectStore.ProjectView::id, p -> p));
        Map<UUID, String> profileNames = workScheduleProfileRepository.findAll().stream()
                .collect(Collectors.toMap(WorkScheduleProfileEntity::getId, WorkScheduleProfileEntity::getName));

        int totalMinutes = 0;
        int billableMinutes = 0;
        BigDecimal totalFinancialAmount = BigDecimal.ZERO;

        Map<UUID, ProjectAccumulator> projectAcc = new HashMap<>();
        Map<UUID, UserAccumulator> userAcc = new HashMap<>();
        Set<UUID> distinctContributors = new HashSet<>();

        for (var sheet : sheets) {
            UUID sheetUserId = sheet.getUserId();
            AppUserEntity user = userMap.get(sheetUserId);
            int weeklyTarget = user != null ? user.getWeeklyTargetMinutes() : AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES;
            int sheetMinutes = 0;

            for (TimeEntryEntity entry : sheet.getEntries()) {
                LocalDate date = entry.getEntryDate();
                if (date.isBefore(period.startDate()) || date.isAfter(period.endDate())) {
                    continue;
                }
                if (targetProjectId != null && !targetProjectId.equals(entry.getProjectId())) {
                    continue;
                }

                int mins = entry.getMinutes();
                totalMinutes += mins;
                sheetMinutes += mins;
                distinctContributors.add(sheetUserId);

                if (entry.isBillable()) {
                    billableMinutes += mins;
                }

                BigDecimal entryAmount = BigDecimal.ZERO;
                if (canViewFinancials && entry.isBillable()) {
                    BigDecimal rate = resolveEffectiveDailyRate(entry.getProjectId(), sheetUserId, projectMap, userMap);
                    if (rate != null) {
                        entryAmount = rate.multiply(BigDecimal.valueOf(mins))
                                .divide(BigDecimal.valueOf(MINUTES_PER_DAY), 2, RoundingMode.HALF_UP);
                        totalFinancialAmount = totalFinancialAmount.add(entryAmount);
                    }
                }

                var pAcc = projectAcc.computeIfAbsent(entry.getProjectId(), ProjectAccumulator::new);
                pAcc.add(mins, entry.isBillable(), sheetUserId, entryAmount);

                var uAcc = userAcc.computeIfAbsent(sheetUserId, UserAccumulator::new);
                uAcc.add(mins, entry.isBillable(), entryAmount);
            }

            if (sheetMinutes > weeklyTarget) {
                int ot = sheetMinutes - weeklyTarget;
                var u = userAcc.get(sheetUserId);
                if (u != null) {
                    u.overtimeMinutes += ot;
                }
            }
        }

        double billableDays = roundDays(billableMinutes);

        List<ProjectBillingItem> projectItems = projectAcc.values().stream()
                .map(p -> {
                    var projView = projectMap.get(p.projectId);
                    String name = projView != null ? projView.name() : "Projet inconnu";
                    String ref = projView != null ? projView.reference() : null;
                    String org = projView != null ? projView.organization() : null;
                    BigDecimal projectDailyRate = canViewFinancials && projView != null ? projView.dailyRate() : null;
                    BigDecimal projectTotalAmount = canViewFinancials ? p.totalAmount : null;
                    return new ProjectBillingItem(
                            p.projectId,
                            name,
                            ref,
                            org,
                            p.totalMinutes,
                            p.billableMinutes,
                            roundDays(p.billableMinutes),
                            projectDailyRate,
                            projectTotalAmount,
                            p.contributors.size()
                    );
                })
                .sorted(Comparator.comparingInt(ProjectBillingItem::billableMinutes).reversed())
                .toList();

        List<UserBillingItem> userItems = userAcc.values().stream()
                .map(u -> {
                    AppUserEntity user = userMap.get(u.userId);
                    String name = user != null ? user.getDisplayName() : "Utilisateur";
                    String email = user != null ? user.getEmail() : "";
                    String role = user != null ? user.getRole().name() : "";
                    String scheduleName = (user != null && user.getWorkScheduleProfileId() != null)
                            ? profileNames.getOrDefault(user.getWorkScheduleProfileId(), "Standard 35h")
                            : "Standard 35h";
                    BigDecimal userDailyRate = canViewFinancials && user != null ? user.getDailyRate() : null;
                    BigDecimal userTotalAmount = canViewFinancials ? u.totalAmount : null;
                    return new UserBillingItem(
                            u.userId,
                            name,
                            email,
                            role,
                            scheduleName,
                            u.totalMinutes,
                            u.billableMinutes,
                            roundDays(u.billableMinutes),
                            u.overtimeMinutes,
                            userDailyRate,
                            userTotalAmount
                    );
                })
                .sorted(Comparator.comparingInt(UserBillingItem::billableMinutes).reversed())
                .toList();

        return new BillingOverview(
                period.rawPeriod(),
                period.label(),
                period.startDate(),
                period.endDate(),
                totalMinutes,
                billableMinutes,
                billableDays,
                projectItems.size(),
                distinctContributors.size(),
                canViewFinancials,
                canViewFinancials ? totalFinancialAmount : null,
                projectItems,
                userItems
        );
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('COLLABORATOR', 'TRAINER', 'MANAGER', 'DIRECTION', 'ADMIN')")
    public List<BillingDetailItem> getDetails(TimeFlowPrincipal principal, String periodStr, UUID targetUserId, UUID targetProjectId) {
        BillingPeriod period = BillingPeriod.parse(periodStr);
        boolean canViewFinancials = principal.role() == UserRole.DIRECTION || principal.role() == UserRole.ADMIN;
        Set<UUID> targetUserIds = resolveUserScope(principal, targetUserId);

        List<TimesheetEntity> sheets = fetchTimesheets(period, targetUserIds);

        Map<UUID, AppUserEntity> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, u -> u));
        Map<UUID, ProjectStore.ProjectView> projectMap = projectStore.list().stream()
                .collect(Collectors.toMap(ProjectStore.ProjectView::id, p -> p));

        List<BillingDetailItem> details = new ArrayList<>();

        for (var sheet : sheets) {
            UUID sheetUserId = sheet.getUserId();
            AppUserEntity user = userMap.get(sheetUserId);
            String userDisplayName = user != null ? user.getDisplayName() : "Utilisateur";

            for (TimeEntryEntity entry : sheet.getEntries()) {
                LocalDate date = entry.getEntryDate();
                if (date.isBefore(period.startDate()) || date.isAfter(period.endDate())) {
                    continue;
                }
                if (targetProjectId != null && !targetProjectId.equals(entry.getProjectId())) {
                    continue;
                }

                var project = projectMap.get(entry.getProjectId());
                String projectName = project != null ? project.name() : "Projet inconnu";

                BigDecimal effectiveRate = null;
                BigDecimal entryAmount = null;

                if (canViewFinancials) {
                    effectiveRate = resolveEffectiveDailyRate(entry.getProjectId(), sheetUserId, projectMap, userMap);
                    if (entry.isBillable() && effectiveRate != null) {
                        entryAmount = effectiveRate.multiply(BigDecimal.valueOf(entry.getMinutes()))
                                .divide(BigDecimal.valueOf(MINUTES_PER_DAY), 2, RoundingMode.HALF_UP);
                    } else {
                        entryAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                    }
                }

                details.add(new BillingDetailItem(
                        date,
                        sheetUserId,
                        userDisplayName,
                        entry.getProjectId(),
                        projectName,
                        entry.getActivityType(),
                        entry.getMinutes(),
                        entry.isBillable(),
                        roundDays(entry.isBillable() ? entry.getMinutes() : 0),
                        effectiveRate,
                        entryAmount,
                        entry.getComment()
                ));
            }
        }

        details.sort(Comparator.comparing(BillingDetailItem::entryDate).reversed()
                .thenComparing(BillingDetailItem::userDisplayName));
        return details;
    }

    private List<TimesheetEntity> fetchTimesheets(BillingPeriod period, Set<UUID> targetUserIds) {
        Set<TimesheetStatus> statuses = Set.of(TimesheetStatus.VALIDATED, TimesheetStatus.LOCKED);
        if (targetUserIds != null) {
            if (targetUserIds.isEmpty()) {
                return List.of();
            }
            return timesheetRepository.findByUserIdsAndWeekRangeAndStatusesWithEntries(
                    targetUserIds, period.startWeek(), period.endWeek(), statuses);
        } else {
            return timesheetRepository.findByWeekRangeAndStatusesWithEntries(
                    period.startWeek(), period.endWeek(), statuses);
        }
    }

    private BigDecimal resolveEffectiveDailyRate(UUID projectId, UUID userId,
                                                 Map<UUID, ProjectStore.ProjectView> projectMap,
                                                 Map<UUID, AppUserEntity> userMap) {
        var project = projectMap.get(projectId);
        if (project != null && project.dailyRate() != null && project.dailyRate().compareTo(BigDecimal.ZERO) > 0) {
            return project.dailyRate();
        }
        var user = userMap.get(userId);
        if (user != null && user.getDailyRate() != null && user.getDailyRate().compareTo(BigDecimal.ZERO) > 0) {
            return user.getDailyRate();
        }
        return null;
    }

    private double roundDays(int minutes) {
        return Math.round((minutes * 100.0) / MINUTES_PER_DAY) / 100.0;
    }

    private Set<UUID> resolveUserScope(TimeFlowPrincipal principal, UUID targetUserId) {
        if (principal.role() == UserRole.COLLABORATOR || principal.role() == UserRole.TRAINER) {
            if (targetUserId != null && !targetUserId.equals(principal.userId())) {
                throw new AccessDeniedException("Un collaborateur ne peut consulter que ses propres éléments.");
            }
            return Set.of(principal.userId());
        }

        if (principal.role() == UserRole.MANAGER) {
            List<AppUserEntity> managed = userRepository.findByManagerId(principal.userId());
            Set<UUID> allowed = new HashSet<>();
            allowed.add(principal.userId());
            for (var u : managed) {
                allowed.add(u.getId());
            }

            if (targetUserId != null) {
                if (!allowed.contains(targetUserId)) {
                    throw new AccessDeniedException("Cet utilisateur n'est pas sous votre responsabilité managériale.");
                }
                return Set.of(targetUserId);
            }
            return allowed;
        }

        if (targetUserId != null) {
            return Set.of(targetUserId);
        }
        return null;
    }

    private static class ProjectAccumulator {
        final UUID projectId;
        int totalMinutes = 0;
        int billableMinutes = 0;
        final Set<UUID> contributors = new HashSet<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        ProjectAccumulator(UUID projectId) { this.projectId = projectId; }

        void add(int mins, boolean billable, UUID userId, BigDecimal amount) {
            totalMinutes += mins;
            contributors.add(userId);
            if (billable) {
                billableMinutes += mins;
                if (amount != null) {
                    totalAmount = totalAmount.add(amount);
                }
            }
        }
    }

    private static class UserAccumulator {
        final UUID userId;
        int totalMinutes = 0;
        int billableMinutes = 0;
        int overtimeMinutes = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;

        UserAccumulator(UUID userId) { this.userId = userId; }

        void add(int mins, boolean billable, BigDecimal amount) {
            totalMinutes += mins;
            if (billable) {
                billableMinutes += mins;
                if (amount != null) {
                    totalAmount = totalAmount.add(amount);
                }
            }
        }
    }
}
