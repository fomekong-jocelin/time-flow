package cm.indyli.timeflow.timesheet.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
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

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TimesheetValidationService {

    private final TimesheetRepository timesheetRepository;
    private final TimesheetValidationRepository validationRepository;
    private final AppUserRepository userRepository;
    private final TimesheetService timesheetService;

    public TimesheetValidationService(TimesheetRepository timesheetRepository,
                                      TimesheetValidationRepository validationRepository,
                                      AppUserRepository userRepository,
                                      TimesheetService timesheetService) {
        this.timesheetRepository = timesheetRepository;
        this.validationRepository = validationRepository;
        this.userRepository = userRepository;
        this.timesheetService = timesheetService;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public List<PendingTimesheetSummary> listPending(TimeFlowPrincipal principal, TimesheetStatus statusFilter, LocalDate weekFilter) {
        List<TimesheetEntity> sheets;

        if (principal.role() == UserRole.MANAGER) {
            List<AppUserEntity> managedUsers = userRepository.findByManagerId(principal.userId());
            if (managedUsers.isEmpty()) {
                return List.of();
            }
            Set<UUID> userIds = managedUsers.stream().map(AppUserEntity::getId).collect(Collectors.toSet());
            sheets = timesheetRepository.findByUserIdsAndStatusWithEntries(userIds, statusFilter);
        } else {
            sheets = timesheetRepository.findAllByStatusWithEntries(statusFilter);
        }

        if (weekFilter != null) {
            sheets = sheets.stream().filter(s -> s.getWeekStart().equals(weekFilter)).toList();
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
                    (int) distinctLines
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
