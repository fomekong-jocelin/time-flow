package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.projects.infrastructure.ProjectStore;
import cm.indyli.timeflow.timesheet.domain.TimesheetPolicy;
import cm.indyli.timeflow.timesheet.domain.TimesheetStatus;
import cm.indyli.timeflow.timesheet.domain.TimesheetValidationException;
import cm.indyli.timeflow.timesheet.domain.ValidationPolicy;
import cm.indyli.timeflow.timesheet.persistence.TimeEntryEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetRepository;
import cm.indyli.timeflow.timesheet.persistence.TimesheetValidationEntity;
import cm.indyli.timeflow.timesheet.persistence.TimesheetValidationRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TimesheetValidationService {

    private final TimesheetRepository timesheetRepository;
    private final TimesheetValidationRepository validationRepository;
    private final AppUserRepository userRepository;
    private final TimesheetService timesheetService;
    private final ProjectStore projectStore;

    public TimesheetValidationService(TimesheetRepository timesheetRepository,
                                      TimesheetValidationRepository validationRepository,
                                      AppUserRepository userRepository,
                                      TimesheetService timesheetService,
                                      ProjectStore projectStore) {
        this.timesheetRepository = timesheetRepository;
        this.validationRepository = validationRepository;
        this.userRepository = userRepository;
        this.timesheetService = timesheetService;
        this.projectStore = projectStore;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public List<SubordinateSummary> getManagedUsers(TimeFlowPrincipal principal) {
        if (principal.role() == UserRole.MANAGER) {
            return userRepository.findByManagerId(principal.userId()).stream()
                    .map(u -> new SubordinateSummary(u.getId(), u.getDisplayName(), u.getEmail(), u.getRole().name()))
                    .sorted(Comparator.comparing(SubordinateSummary::displayName))
                    .toList();
        }
        return userRepository.findAll().stream()
                .map(u -> new SubordinateSummary(u.getId(), u.getDisplayName(), u.getEmail(), u.getRole().name()))
                .sorted(Comparator.comparing(SubordinateSummary::displayName))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public List<PendingTimesheetSummary> listPending(TimeFlowPrincipal principal, TimesheetStatus statusFilter, LocalDate weekFilter) {
        return listPending(principal, statusFilter, weekFilter, null, null, null, null);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public List<PendingTimesheetSummary> listPending(
            TimeFlowPrincipal principal,
            TimesheetStatus statusFilter,
            LocalDate weekFilter,
            UUID targetUserId,
            UUID targetProjectId,
            LocalDate fromWeek,
            LocalDate toWeek
    ) {
        List<TimesheetEntity> sheets;

        if (principal.role() == UserRole.MANAGER) {
            List<AppUserEntity> managedUsers = userRepository.findByManagerId(principal.userId());
            Set<UUID> allowedUserIds = new HashSet<>();
            allowedUserIds.add(principal.userId());
            for (var u : managedUsers) {
                allowedUserIds.add(u.getId());
            }

            if (targetUserId != null) {
                if (!allowedUserIds.contains(targetUserId)) {
                    throw new org.springframework.security.access.AccessDeniedException("Cet utilisateur n'est pas sous votre responsabilité managériale.");
                }
                sheets = timesheetRepository.findByUserIdsAndStatusWithEntries(Set.of(targetUserId), statusFilter);
            } else {
                if (managedUsers.isEmpty()) {
                    sheets = List.of();
                } else {
                    Set<UUID> userIds = managedUsers.stream().map(AppUserEntity::getId).collect(Collectors.toSet());
                    sheets = timesheetRepository.findByUserIdsAndStatusWithEntries(userIds, statusFilter);
                }
            }
        } else {
            if (targetUserId != null) {
                sheets = timesheetRepository.findByUserIdsAndStatusWithEntries(Set.of(targetUserId), statusFilter);
            } else {
                sheets = timesheetRepository.findAllByStatusWithEntries(statusFilter);
            }
        }

        if (weekFilter != null) {
            sheets = sheets.stream().filter(s -> s.getWeekStart().equals(weekFilter)).toList();
        }
        if (fromWeek != null) {
            sheets = sheets.stream().filter(s -> !s.getWeekStart().isBefore(fromWeek)).toList();
        }
        if (toWeek != null) {
            sheets = sheets.stream().filter(s -> !s.getWeekStart().isAfter(toWeek)).toList();
        }
        if (targetProjectId != null) {
            sheets = sheets.stream()
                    .filter(s -> s.getEntries().stream().anyMatch(e -> targetProjectId.equals(e.getProjectId())))
                    .toList();
        }

        Map<UUID, AppUserEntity> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, u -> u));

        List<PendingTimesheetSummary> summaries = new ArrayList<>();
        for (var sheet : sheets) {
            AppUserEntity user = usersById.get(sheet.getUserId());
            String displayName = user != null ? user.getDisplayName() : "Utilisateur inconnu";
            String email = user != null ? user.getEmail() : "";

            int totalMinutes = sheet.getEntries().stream().mapToInt(TimeEntryEntity::getMinutes).sum();
            int billableMinutes = sheet.getEntries().stream()
                    .filter(TimeEntryEntity::isBillable)
                    .mapToInt(TimeEntryEntity::getMinutes)
                    .sum();

            record LineKey(UUID projectId, String activityType, boolean billable) {
            }
            long distinctLines = sheet.getEntries().stream()
                    .map(e -> new LineKey(e.getProjectId(), e.getActivityType(), e.isBillable()))
                    .distinct()
                    .count();

            boolean selfTimesheet = principal.userId().equals(sheet.getUserId());
            int weeklyTargetMinutes = user != null ? user.getWeeklyTargetMinutes() : AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES;

            List<String> projectNames = sheet.getEntries().stream()
                    .map(TimeEntryEntity::getProjectId)
                    .distinct()
                    .map(pid -> projectStore.findById(pid).map(ProjectStore.ProjectView::name).orElse("Projet"))
                    .toList();

            Map<LocalDate, Integer> dailySums = new HashMap<>();
            boolean hasWeekendWork = false;
            for (var entry : sheet.getEntries()) {
                dailySums.merge(entry.getEntryDate(), entry.getMinutes(), Integer::sum);
                var dow = entry.getEntryDate().getDayOfWeek();
                if ((dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) && entry.getMinutes() > 0) {
                    hasWeekendWork = true;
                }
            }
            boolean hasExcessiveDay = dailySums.values().stream().anyMatch(m -> m > TimesheetPolicy.STATUTORY_MAX_DAILY_MINUTES);
            boolean complianceAlert = totalMinutes > TimesheetPolicy.STATUTORY_MAX_WEEKLY_MINUTES || hasExcessiveDay || hasWeekendWork;

            summaries.add(new PendingTimesheetSummary(
                    sheet.getId(),
                    sheet.getUserId(),
                    displayName,
                    email,
                    sheet.getWeekStart(),
                    sheet.getWeekStart().plusDays(6),
                    sheet.getStatus(),
                    sheet.getSubmittedAt(),
                    totalMinutes,
                    billableMinutes,
                    (int) distinctLines,
                    selfTimesheet,
                    projectNames,
                    weeklyTargetMinutes,
                    complianceAlert
            ));
        }

        return summaries;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public ManagerTimesheetDetail getTimesheetDetail(TimeFlowPrincipal principal, UUID timesheetId) {
        var sheet = timesheetRepository.findByIdWithEntries(timesheetId)
                .orElseThrow(() -> new TimesheetValidationException("Feuille de temps introuvable."));
        var author = userRepository.findById(sheet.getUserId())
                .orElseThrow(() -> new TimesheetValidationException("Auteur introuvable."));

        ValidationPolicy.ensureManagerScope(author.getManagerId(), principal.userId(), principal.role());

        var overview = timesheetService.mapToOverview(sheet, author.getWeeklyTargetMinutes(), null);

        var historyEntities = validationRepository.findByTimesheetIdOrderByDecidedAtDesc(timesheetId);
        Map<UUID, String> validatorNames = new HashMap<>();
        List<ManagerTimesheetDetail.ValidationHistoryItem> historyItems = new ArrayList<>();

        for (var h : historyEntities) {
            String validatorName = validatorNames.computeIfAbsent(h.getValidatorUserId(), id ->
                    userRepository.findById(id).map(AppUserEntity::getDisplayName).orElse("Validateur inconnu")
            );
            historyItems.add(new ManagerTimesheetDetail.ValidationHistoryItem(
                    h.getId(),
                    h.getDecision(),
                    h.getComment(),
                    validatorName,
                    h.getDecidedAt().toString()
            ));
        }

        return new ManagerTimesheetDetail(
                sheet.getId(),
                author.getId(),
                author.getDisplayName(),
                author.getEmail(),
                overview,
                historyItems
        );
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public ManagerTimesheetDetail getSubordinateWeekDetail(TimeFlowPrincipal principal, UUID userId, LocalDate weekStart) {
        TimesheetPolicy.ensureValidWeekStart(weekStart);
        var author = userRepository.findById(userId)
                .orElseThrow(() -> new TimesheetValidationException("Collaborateur introuvable."));

        ValidationPolicy.ensureManagerScope(author.getManagerId(), principal.userId(), principal.role());

        var existing = timesheetRepository.findByUserIdAndWeekStartWithEntries(userId, weekStart);
        if (existing.isPresent()) {
            return getTimesheetDetail(principal, existing.get().getId());
        }

        var emptyOverview = timesheetService.buildEmptyOverview(userId, weekStart, author.getWeeklyTargetMinutes());
        return new ManagerTimesheetDetail(
                null,
                author.getId(),
                author.getDisplayName(),
                author.getEmail(),
                emptyOverview,
                List.of()
        );
    }

    @Transactional
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public ManagerTimesheetDetail validate(TimeFlowPrincipal principal, UUID timesheetId, String comment) {
        var sheet = timesheetRepository.findByIdWithEntries(timesheetId)
                .orElseThrow(() -> new TimesheetValidationException("Feuille de temps introuvable."));
        var author = userRepository.findById(sheet.getUserId())
                .orElseThrow(() -> new TimesheetValidationException("Auteur introuvable."));

        ValidationPolicy.ensureCanReview(sheet.getStatus());
        ValidationPolicy.ensureNotSelfValidation(author.getId(), principal.userId());
        ValidationPolicy.ensureManagerScope(author.getManagerId(), principal.userId(), principal.role());

        sheet.validate();
        timesheetRepository.save(sheet);

        var record = TimesheetValidationEntity.record(timesheetId, principal.userId(), "VALIDATED", comment);
        validationRepository.save(record);

        return getTimesheetDetail(principal, timesheetId);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public ManagerTimesheetDetail reject(TimeFlowPrincipal principal, UUID timesheetId, String comment) {
        var sheet = timesheetRepository.findByIdWithEntries(timesheetId)
                .orElseThrow(() -> new TimesheetValidationException("Feuille de temps introuvable."));
        var author = userRepository.findById(sheet.getUserId())
                .orElseThrow(() -> new TimesheetValidationException("Auteur introuvable."));

        ValidationPolicy.ensureCanReview(sheet.getStatus());
        ValidationPolicy.ensureNotSelfValidation(author.getId(), principal.userId());
        ValidationPolicy.ensureManagerScope(author.getManagerId(), principal.userId(), principal.role());
        ValidationPolicy.ensureValidRejectionComment(comment);

        sheet.reject();
        timesheetRepository.save(sheet);

        var record = TimesheetValidationEntity.record(timesheetId, principal.userId(), "REJECTED", comment);
        validationRepository.save(record);

        return getTimesheetDetail(principal, timesheetId);
    }
}
