package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.holidays.persistence.PublicHolidayRepository;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.domain.TimesheetPolicy;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import cm.indyli.timeflow.timesheet.domain.TimesheetValidationException;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class TimesheetService {

    private final TimesheetRepository timesheetRepository;
    private final AppUserRepository userRepository;
    private final ProjectStore projectStore;
    private final JdbcClient jdbc;
    private final PublicHolidayRepository publicHolidayRepository;

    public TimesheetService(TimesheetRepository timesheetRepository,
                            AppUserRepository userRepository,
                            ProjectStore projectStore,
                            JdbcClient jdbc,
                            PublicHolidayRepository publicHolidayRepository) {
        this.timesheetRepository = timesheetRepository;
        this.userRepository = userRepository;
        this.projectStore = projectStore;
        this.jdbc = jdbc;
        this.publicHolidayRepository = publicHolidayRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview getTimesheet(UUID userId, LocalDate weekStart) {
        TimesheetPolicy.ensureValidWeekStart(weekStart);
        int weeklyTargetMinutes = userRepository.findById(userId)
                .map(AppUserEntity::getWeeklyTargetMinutes)
                .orElse(AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES);

        var existing = timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, weekStart);
        if (existing.isEmpty()) {
            return buildEmptyOverview(userId, weekStart, weeklyTargetMinutes);
        }

        var timesheet = existing.get();
        String rejectionComment = null;
        if (timesheet.getStatus() == TimesheetStatus.REJECTED) {
            rejectionComment = findLatestRejectionComment(timesheet.getId());
        }
        return mapToOverview(timesheet, weeklyTargetMinutes, rejectionComment);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview saveDraft(UUID userId, LocalDate weekStart, SaveTimesheetCommand command) {
        TimesheetPolicy.ensureValidWeekStart(weekStart);
        int weeklyTargetMinutes = userRepository.findById(userId)
                .map(AppUserEntity::getWeeklyTargetMinutes)
                .orElse(AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES);

        var timesheet = timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, weekStart)
                .orElseGet(() -> TimesheetEntity.draft(userId, weekStart));

        TimesheetPolicy.ensureCanEdit(timesheet.getStatus());

        // Validate daily totals and project validity
        Map<LocalDate, Integer> dailyTotals = new HashMap<>();
        List<TimeEntryEntity> newEntries = new ArrayList<>();

        if (command.lines() != null) {
            for (var line : command.lines()) {
                var projectOpt = projectStore.findById(line.projectId());
                if (projectOpt.isEmpty() || !projectOpt.get().active()) {
                    throw new TimesheetValidationException(
                            "Le projet sélectionné n'existe pas ou n'est plus actif (id: " + line.projectId() + ")."
                    );
                }
                var project = projectOpt.get();
                boolean billable = line.billable() != null ? line.billable() : project.billableDefault();

                if (line.entries() != null) {
                    for (var entry : line.entries()) {
                        TimesheetPolicy.ensureEntryInWeek(entry.entryDate(), weekStart);
                        TimesheetPolicy.ensureValidMinutes(entry.minutes());

                        if (entry.minutes() > 0) {
                            dailyTotals.merge(entry.entryDate(), entry.minutes(), Integer::sum);
                            String entryComment = (entry.comment() != null && !entry.comment().isBlank())
                                    ? entry.comment().trim()
                                    : (line.comment() != null && !line.comment().isBlank() ? line.comment().trim() : null);

                            String workItemId = (line.workItemId() != null && !line.workItemId().isBlank())
                                    ? line.workItemId().trim()
                                    : null;
                            String workItemTitle = (line.workItemTitle() != null && !line.workItemTitle().isBlank())
                                    ? line.workItemTitle().trim()
                                    : null;

                            newEntries.add(TimeEntryEntity.create(
                                    line.projectId(),
                                    workItemId,
                                    workItemTitle,
                                    line.activityType(),
                                    entry.entryDate(),
                                    entry.minutes(),
                                    billable,
                                    entryComment
                            ));
                        }
                    }
                }
            }
        }

        TimesheetPolicy.ensureDailyTotalsWithinLimit(dailyTotals);

        timesheet.replaceEntries(newEntries);
        var saved = timesheetRepository.save(timesheet);

        return mapToOverview(saved, weeklyTargetMinutes, null);
    }

    @Transactional
    @PreAuthorize("isAuthenticated()")
    public TimesheetOverview submit(UUID userId, LocalDate weekStart, SaveTimesheetCommand optionalCommand) {
        TimesheetPolicy.ensureValidWeekStart(weekStart);
        if (optionalCommand != null) {
            saveDraft(userId, weekStart, optionalCommand);
        }

        var timesheet = timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, weekStart)
                .orElseThrow(() -> new TimesheetValidationException("Aucune feuille de temps enregistrée pour cette semaine."));

        int totalMinutes = timesheet.getEntries().stream().mapToInt(TimeEntryEntity::getMinutes).sum();
        TimesheetPolicy.ensureCanSubmit(timesheet.getStatus(), totalMinutes);

        timesheet.submit();
        var saved = timesheetRepository.save(timesheet);

        int weeklyTargetMinutes = userRepository.findById(userId)
                .map(AppUserEntity::getWeeklyTargetMinutes)
                .orElse(AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES);

        return mapToOverview(saved, weeklyTargetMinutes, null);
    }

    public TimesheetOverview buildEmptyOverview(UUID userId, LocalDate weekStart, int weeklyTargetMinutes) {
        Map<String, Integer> dailyTotals = new LinkedHashMap<>();
        for (int i = 0; i < 7; i++) {
            dailyTotals.put(weekStart.plusDays(i).toString(), 0);
        }

        List<TimesheetOverview.HolidayOverview> holidays = getHolidaysForWeek(weekStart);

        return new TimesheetOverview(
                null,
                userId,
                weekStart,
                weekStart.plusDays(6),
                TimesheetStatus.DRAFT,
                null,
                null,
                null,
                weeklyTargetMinutes,
                0,
                0,
                0,
                dailyTotals,
                List.of(),
                null,
                true,
                holidays,
                0,
                0
        );
    }

    public TimesheetOverview mapToOverview(TimesheetEntity timesheet, int weeklyTargetMinutes, String rejectionComment) {
        LocalDate weekStart = timesheet.getWeekStart();
        Map<String, Integer> dailyTotals = new LinkedHashMap<>();
        for (int i = 0; i < 7; i++) {
            dailyTotals.put(weekStart.plusDays(i).toString(), 0);
        }

        int totalMinutes = 0;
        int billableMinutes = 0;
        int internalMinutes = 0;

        record LineKey(UUID projectId, String workItemId, String workItemTitle, String activityType, boolean billable) {
        }
        record DayEntryData(int minutes, String comment) {
        }
        Map<LineKey, Map<LocalDate, DayEntryData>> grouped = new LinkedHashMap<>();

        for (var entry : timesheet.getEntries()) {
            totalMinutes += entry.getMinutes();
            if (entry.isBillable()) {
                billableMinutes += entry.getMinutes();
            }
            if ("INTERNAL".equalsIgnoreCase(entry.getActivityType()) || !entry.isBillable()) {
                internalMinutes += entry.getMinutes();
            }
            dailyTotals.merge(entry.getEntryDate().toString(), entry.getMinutes(), Integer::sum);

            var key = new LineKey(
                    entry.getProjectId(),
                    entry.getWorkItemId(),
                    entry.getWorkItemTitle(),
                    entry.getActivityType(),
                    entry.isBillable()
            );
            grouped.computeIfAbsent(key, k -> new HashMap<>())
                    .merge(entry.getEntryDate(),
                            new DayEntryData(entry.getMinutes(), entry.getComment()),
                            (oldVal, newVal) -> new DayEntryData(
                                    oldVal.minutes() + newVal.minutes(),
                                    newVal.comment() != null ? newVal.comment() : oldVal.comment()
                            ));
        }

        List<TimesheetOverview.TimesheetLineOverview> lines = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            var key = entry.getKey();
            var dayMap = entry.getValue();
            var projectView = projectStore.findById(key.projectId()).orElse(null);
            String projectName = projectView != null ? projectView.name() : "Projet inconnu";

            List<TimesheetOverview.DayEntryOverview> dayEntries = new ArrayList<>();
            int lineTotal = 0;
            String firstComment = null;
            for (int i = 0; i < 7; i++) {
                LocalDate date = weekStart.plusDays(i);
                DayEntryData dayData = dayMap.get(date);
                int minutes = dayData != null ? dayData.minutes() : 0;
                String comment = dayData != null ? dayData.comment() : null;
                if (firstComment == null && comment != null && !comment.isBlank()) {
                    firstComment = comment;
                }
                lineTotal += minutes;
                dayEntries.add(new TimesheetOverview.DayEntryOverview(date, minutes, comment));
            }

            lines.add(new TimesheetOverview.TimesheetLineOverview(
                    key.projectId(),
                    projectName,
                    null,
                    key.workItemId(),
                    key.workItemTitle(),
                    key.activityType(),
                    key.billable(),
                    firstComment,
                    lineTotal,
                    dayEntries
            ));
        }

        boolean editable = timesheet.getStatus() == TimesheetStatus.DRAFT || timesheet.getStatus() == TimesheetStatus.REJECTED;
        List<TimesheetOverview.HolidayOverview> holidays = getHolidaysForWeek(weekStart);

        int overtimeMinutes = Math.max(0, totalMinutes - weeklyTargetMinutes);
        int extraTimeMinutes = 0;

        return new TimesheetOverview(
                timesheet.getId(),
                timesheet.getUserId(),
                timesheet.getWeekStart(),
                timesheet.getWeekStart().plusDays(6),
                timesheet.getStatus(),
                timesheet.getSubmittedAt(),
                timesheet.getValidatedAt(),
                timesheet.getLockedAt(),
                weeklyTargetMinutes,
                totalMinutes,
                billableMinutes,
                internalMinutes,
                dailyTotals,
                lines,
                rejectionComment,
                editable,
                holidays,
                overtimeMinutes,
                extraTimeMinutes
        );
    }

    private List<TimesheetOverview.HolidayOverview> getHolidaysForWeek(LocalDate weekStart) {
        if (publicHolidayRepository == null) {
            return List.of();
        }
        return publicHolidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(weekStart, weekStart.plusDays(6))
                .stream()
                .map(h -> new TimesheetOverview.HolidayOverview(h.getHolidayDate(), h.getName(), h.isWorked()))
                .toList();
    }

    private String findLatestRejectionComment(UUID timesheetId) {
        if (timesheetId == null) {
            return null;
        }
        return jdbc.sql("""
                SELECT comment FROM timesheet_validation
                WHERE timesheet_id = :id AND decision = 'REJECTED'
                ORDER BY decided_at DESC LIMIT 1
                """).param("id", timesheetId)
                .query(String.class).optional().orElse(null);
    }
}
