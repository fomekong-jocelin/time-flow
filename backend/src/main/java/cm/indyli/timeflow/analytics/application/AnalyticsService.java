package cm.indyli.timeflow.analytics.application;

import cm.indyli.timeflow.analytics.domain.AnalyticsPeriod;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
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

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final TimesheetRepository timesheetRepository;
    private final AppUserRepository userRepository;
    private final ProjectStore projectStore;
    private final WorkScheduleProfileRepository workScheduleProfileRepository;

    public AnalyticsService(TimesheetRepository timesheetRepository,
                            AppUserRepository userRepository,
                            ProjectStore projectStore,
                            WorkScheduleProfileRepository workScheduleProfileRepository) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.projectStore = projectStore;
        this.workScheduleProfileRepository = workScheduleProfileRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public AnalyticsOverview getOverview(TimeFlowPrincipal principal, String periodStr, UUID targetUserId, UUID targetProjectId) {
        AnalyticsPeriod period = AnalyticsPeriod.parse(periodStr);

        Set<UUID> targetUserIds = resolveUserScope(principal, targetUserId);

        List<TimesheetEntity> sheets;
        Set<TimesheetStatus> statuses = Set.of(TimesheetStatus.VALIDATED, TimesheetStatus.SUBMITTED);

        if (targetUserIds != null) {
            if (targetUserIds.isEmpty()) {
                return emptyOverview(period);
            }
            sheets = timesheetRepository.findByUserIdsAndWeekRangeAndStatusesWithEntries(
                    targetUserIds, period.startWeek(), period.endWeek(), statuses);
        } else {
            sheets = timesheetRepository.findByWeekRangeAndStatusesWithEntries(
                    period.startWeek(), period.endWeek(), statuses);
        }

        Map<UUID, AppUserEntity> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, u -> u));
        Map<UUID, String> profileNames = workScheduleProfileRepository.findAll().stream()
                .collect(Collectors.toMap(WorkScheduleProfileEntity::getId, WorkScheduleProfileEntity::getName));

        int totalMinutes = 0;
        int billableMinutes = 0;
        int internalMinutes = 0;
        int trainingMinutes = 0;
        int overtimeMinutes = 0;

        Set<UUID> contributorIds = new HashSet<>();
        Set<UUID> countedTimesheetIds = new HashSet<>();

        Map<UUID, ProjectAccumulator> projectAcc = new HashMap<>();
        Map<String, Integer> activityMinutes = new HashMap<>();
        Map<UUID, UserAccumulator> userAcc = new HashMap<>();
        Map<String, MonthlyAccumulator> monthAcc = new TreeMap<>();
        Map<LocalDate, DailyAccumulator> dayAcc = new HashMap<>();

        for (var sheet : sheets) {
            UUID sheetUserId = sheet.getUserId();
            AppUserEntity user = userMap.get(sheetUserId);
            int weeklyTarget = user != null ? user.getWeeklyTargetMinutes() : AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES;

            int sheetPeriodMinutes = 0;

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
                sheetPeriodMinutes += mins;
                contributorIds.add(sheetUserId);
                countedTimesheetIds.add(sheet.getId());

                if (entry.isBillable()) {
                    billableMinutes += mins;
                }

                String act = entry.getActivityType() != null ? entry.getActivityType().toUpperCase(Locale.ROOT) : "AUTRE";
                if ("TRAINING".equalsIgnoreCase(act) || "FORMATION".equalsIgnoreCase(act)) {
                    trainingMinutes += mins;
                } else if ("INTERNAL".equalsIgnoreCase(act) || "INTERNE".equalsIgnoreCase(act) || !entry.isBillable()) {
                    internalMinutes += mins;
                }

                activityMinutes.merge(act, mins, Integer::sum);

                var proj = projectAcc.computeIfAbsent(entry.getProjectId(), ProjectAccumulator::new);
                proj.add(mins, entry.isBillable());

                var uAcc = userAcc.computeIfAbsent(sheetUserId, UserAccumulator::new);
                uAcc.add(mins, entry.isBillable());

                String monthKey = date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
                var mAcc = monthAcc.computeIfAbsent(monthKey, MonthlyAccumulator::new);
                mAcc.add(mins, entry.isBillable());

                var dAcc = dayAcc.computeIfAbsent(date, DailyAccumulator::new);
                dAcc.add(mins, entry.isBillable());
            }

            if (sheetPeriodMinutes > weeklyTarget) {
                int ot = sheetPeriodMinutes - weeklyTarget;
                overtimeMinutes += ot;
                var u = userAcc.get(sheetUserId);
                if (u != null) {
                    u.overtimeMinutes += ot;
                }
            }
        }

        double activityRate = totalMinutes > 0
                ? Math.round((billableMinutes * 1000.0) / totalMinutes) / 10.0
                : 0.0;

        final int finalTotal = totalMinutes;
        List<ProjectBreakdownItem> projectsBreakdown = projectAcc.values().stream()
                .map(p -> {
                    var projView = projectStore.findById(p.projectId).orElse(null);
                    String name = projView != null ? projView.name() : "Projet inconnu";
                    String ref = projView != null ? projView.reference() : null;
                    double share = finalTotal > 0 ? Math.round((p.totalMinutes * 1000.0) / finalTotal) / 10.0 : 0.0;
                    return new ProjectBreakdownItem(p.projectId, name, ref, p.totalMinutes, p.billableMinutes, share);
                })
                .sorted(Comparator.comparingInt(ProjectBreakdownItem::totalMinutes).reversed())
                .toList();

        List<ActivityBreakdownItem> activitiesBreakdown = activityMinutes.entrySet().stream()
                .map(e -> {
                    String label = formatActivityLabel(e.getKey());
                    double share = finalTotal > 0 ? Math.round((e.getValue() * 1000.0) / finalTotal) / 10.0 : 0.0;
                    return new ActivityBreakdownItem(e.getKey(), label, e.getValue(), share);
                })
                .sorted(Comparator.comparingInt(ActivityBreakdownItem::totalMinutes).reversed())
                .toList();

        List<UserBreakdownItem> usersBreakdown = List.of();
        if (principal.role() != UserRole.COLLABORATOR) {
            usersBreakdown = userAcc.values().stream()
                    .map(u -> {
                        AppUserEntity user = userMap.get(u.userId);
                        String name = user != null ? user.getDisplayName() : "Utilisateur";
                        String email = user != null ? user.getEmail() : "";
                        String role = user != null ? user.getRole().name() : "";
                        String scheduleName = (user != null && user.getWorkScheduleProfileId() != null)
                                ? profileNames.getOrDefault(user.getWorkScheduleProfileId(), "Standard 35h")
                                : "Standard 35h";
                        double rate = u.totalMinutes > 0 ? Math.round((u.billableMinutes * 1000.0) / u.totalMinutes) / 10.0 : 0.0;
                        return new UserBreakdownItem(u.userId, name, email, role, scheduleName, u.totalMinutes, u.billableMinutes, u.overtimeMinutes, rate);
                    })
                    .sorted(Comparator.comparingInt(UserBreakdownItem::totalMinutes).reversed())
                    .toList();
        }

        List<MonthlyTrendItem> monthlyTrend = monthAcc.values().stream()
                .map(m -> {
                    double rate = m.totalMinutes > 0 ? Math.round((m.billableMinutes * 1000.0) / m.totalMinutes) / 10.0 : 0.0;
                    String label = formatMonthLabel(m.month);
                    return new MonthlyTrendItem(m.month, label, m.totalMinutes, m.billableMinutes, rate);
                })
                .toList();

        List<DailyTrendItem> dailyTrend = new ArrayList<>();
        long daysSpan = java.time.temporal.ChronoUnit.DAYS.between(period.startDate(), period.endDate()) + 1;
        if (daysSpan <= 62) {
            LocalDate cursor = period.startDate();
            DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("d MMM", Locale.FRENCH);
            while (!cursor.isAfter(period.endDate())) {
                DailyAccumulator d = dayAcc.get(cursor);
                int dayTotal = d != null ? d.totalMinutes : 0;
                int dayBillable = d != null ? d.billableMinutes : 0;
                dailyTrend.add(new DailyTrendItem(cursor, cursor.format(dayFmt), cursor.getDayOfMonth(), dayTotal, dayBillable));
                cursor = cursor.plusDays(1);
            }
        }

        return new AnalyticsOverview(
                period.rawPeriod(),
                period.label(),
                period.startDate(),
                period.endDate(),
                totalMinutes,
                billableMinutes,
                internalMinutes,
                trainingMinutes,
                overtimeMinutes,
                activityRate,
                countedTimesheetIds.size(),
                contributorIds.size(),
                projectsBreakdown,
                activitiesBreakdown,
                usersBreakdown,
                monthlyTrend,
                dailyTrend
        );
    }

    private Set<UUID> resolveUserScope(TimeFlowPrincipal principal, UUID targetUserId) {
        if (principal.role() == UserRole.COLLABORATOR) {
            if (targetUserId != null && !targetUserId.equals(principal.userId())) {
                throw new AccessDeniedException("Un collaborateur ne peut consulter que ses propres analyses.");
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

    private AnalyticsOverview emptyOverview(AnalyticsPeriod period) {
        return new AnalyticsOverview(
                period.rawPeriod(),
                period.label(),
                period.startDate(),
                period.endDate(),
                0, 0, 0, 0, 0, 0.0, 0, 0,
                List.of(), List.of(), List.of(), List.of(), List.of()
        );
    }

    private String formatActivityLabel(String activityType) {
        if ("PROJECT".equalsIgnoreCase(activityType) || "PROJET".equalsIgnoreCase(activityType)) return "Mission client";
        if ("INTERNAL".equalsIgnoreCase(activityType) || "INTERNE".equalsIgnoreCase(activityType)) return "Interne & Structure";
        if ("TRAINING".equalsIgnoreCase(activityType) || "FORMATION".equalsIgnoreCase(activityType)) return "Formation";
        if ("SUPPORT".equalsIgnoreCase(activityType)) return "Support & Astreinte";
        if ("CONGE".equalsIgnoreCase(activityType) || "LEAVE".equalsIgnoreCase(activityType)) return "Congé / Absence";
        return activityType;
    }

    private String formatMonthLabel(String yearMonthStr) {
        try {
            YearMonth ym = YearMonth.parse(yearMonthStr);
            String m = ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            return m.substring(0, 1).toUpperCase(Locale.ROOT) + m.substring(1);
        } catch (Exception e) {
            return yearMonthStr;
        }
    }

    private static class ProjectAccumulator {
        final UUID projectId;
        int totalMinutes = 0;
        int billableMinutes = 0;

        ProjectAccumulator(UUID projectId) { this.projectId = projectId; }
        void add(int mins, boolean billable) {
            totalMinutes += mins;
            if (billable) billableMinutes += mins;
        }
    }

    private static class UserAccumulator {
        final UUID userId;
        int totalMinutes = 0;
        int billableMinutes = 0;
        int overtimeMinutes = 0;

        UserAccumulator(UUID userId) { this.userId = userId; }
        void add(int mins, boolean billable) {
            totalMinutes += mins;
            if (billable) billableMinutes += mins;
        }
    }

    private static class MonthlyAccumulator {
        final String month;
        int totalMinutes = 0;
        int billableMinutes = 0;

        MonthlyAccumulator(String month) { this.month = month; }
        void add(int mins, boolean billable) {
            totalMinutes += mins;
            if (billable) billableMinutes += mins;
        }
    }

    private static class DailyAccumulator {
        final LocalDate date;
        int totalMinutes = 0;
        int billableMinutes = 0;

        DailyAccumulator(LocalDate date) { this.date = date; }
        void add(int mins, boolean billable) {
            totalMinutes += mins;
            if (billable) billableMinutes += mins;
        }
    }
}
