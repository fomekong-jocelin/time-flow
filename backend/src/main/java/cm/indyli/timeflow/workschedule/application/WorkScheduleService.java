package cm.indyli.timeflow.workschedule.application;

import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.workschedule.domain.WorkSchedulePolicy;
import cm.indyli.timeflow.workschedule.domain.WorkScheduleValidationException;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class WorkScheduleService {

    private final WorkScheduleProfileRepository profileRepository;
    private final AppUserRepository userRepository;

    public WorkScheduleService(WorkScheduleProfileRepository profileRepository, AppUserRepository userRepository) {
        this.profileRepository = profileRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public List<WorkScheduleSummary> listAll(boolean includeInactive) {
        List<WorkScheduleProfileEntity> entities = includeInactive
                ? profileRepository.findAllByOrderByIsDefaultDescActiveDescNameAsc()
                : profileRepository.findByActiveTrueOrderByIsDefaultDescNameAsc();

        return entities.stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public WorkScheduleSummary getForUser(UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new WorkScheduleValidationException("Utilisateur introuvable."));

        if (user.getWorkScheduleProfileId() != null) {
            var profile = profileRepository.findById(user.getWorkScheduleProfileId());
            if (profile.isPresent() && profile.get().isActive()) {
                return toSummary(profile.get());
            }
        }

        return toSummary(getDefaultProfile());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('MANAGER', 'DIRECTION', 'ADMIN')")
    public WorkScheduleSummary getById(UUID id) {
        return toSummary(findProfile(id));
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public WorkScheduleSummary create(CreateWorkScheduleCommand cmd) {
        String workingDaysStr = String.join(",", cmd.workingDays());
        WorkSchedulePolicy.validateProfile(
                cmd.code(), cmd.name(), cmd.weeklyTargetMinutes(), cmd.dailyTargetMinutes(),
                cmd.maxDailyMinutes(), cmd.maxWeeklyMinutes(), workingDaysStr
        );

        if (profileRepository.findByCodeIgnoreCase(cmd.code().trim()).isPresent()) {
            throw new WorkScheduleValidationException("Un profil avec le code " + cmd.code() + " existe déjà.");
        }

        int otThreshold = (cmd.overtimeThresholdMinutes() != null && cmd.overtimeThresholdMinutes() > 0)
                ? cmd.overtimeThresholdMinutes() : cmd.weeklyTargetMinutes();
        BigDecimal otTier1 = cmd.overtimeRateTier1() != null ? cmd.overtimeRateTier1() : BigDecimal.valueOf(1.25);
        BigDecimal otTier2 = cmd.overtimeRateTier2() != null ? cmd.overtimeRateTier2() : BigDecimal.valueOf(1.50);
        BigDecimal otHol = cmd.overtimeRateHoliday() != null ? cmd.overtimeRateHoliday() : BigDecimal.valueOf(2.00);
        String otComp = (cmd.overtimeCompensationMode() != null && !cmd.overtimeCompensationMode().isBlank())
                ? cmd.overtimeCompensationMode().trim().toUpperCase() : "PAY";

        boolean etAllowed = cmd.extraTimeAllowed() != null ? cmd.extraTimeAllowed() : true;
        int etMax = cmd.extraTimeMaxWeeklyMinutes() != null ? cmd.extraTimeMaxWeeklyMinutes() : 420;
        BigDecimal etRate = cmd.extraTimeRate() != null ? cmd.extraTimeRate() : BigDecimal.valueOf(1.10);
        String etComp = (cmd.extraTimeCompensationMode() != null && !cmd.extraTimeCompensationMode().isBlank())
                ? cmd.extraTimeCompensationMode().trim().toUpperCase() : "PAY";

        WorkSchedulePolicy.validateOtEt(otThreshold, otTier1, otTier2, otHol, otComp, etMax, etRate, etComp);

        var entity = WorkScheduleProfileEntity.create(
                cmd.code().trim().toUpperCase(),
                cmd.name().trim(),
                cmd.description() != null ? cmd.description().trim() : null,
                cmd.weeklyTargetMinutes(),
                cmd.dailyTargetMinutes(),
                cmd.maxDailyMinutes(),
                cmd.maxWeeklyMinutes(),
                workingDaysStr,
                cmd.allowWeekendEntry(),
                cmd.isDefault(),
                otThreshold,
                otTier1,
                otTier2,
                otHol,
                otComp,
                etAllowed,
                etMax,
                etRate,
                etComp
        );

        entity = profileRepository.save(entity);

        if (cmd.isDefault()) {
            profileRepository.resetOtherDefaults(entity.getId());
        }

        return toSummary(entity);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public WorkScheduleSummary update(UUID id, UpdateWorkScheduleCommand cmd) {
        var entity = findProfile(id);
        String workingDaysStr = String.join(",", cmd.workingDays());
        WorkSchedulePolicy.validateProfile(
                entity.getCode(), cmd.name(), cmd.weeklyTargetMinutes(), cmd.dailyTargetMinutes(),
                cmd.maxDailyMinutes(), cmd.maxWeeklyMinutes(), workingDaysStr
        );

        int otThreshold = (cmd.overtimeThresholdMinutes() != null && cmd.overtimeThresholdMinutes() > 0)
                ? cmd.overtimeThresholdMinutes() : entity.getOvertimeThresholdMinutes();
        BigDecimal otTier1 = cmd.overtimeRateTier1() != null ? cmd.overtimeRateTier1() : entity.getOvertimeRateTier1();
        BigDecimal otTier2 = cmd.overtimeRateTier2() != null ? cmd.overtimeRateTier2() : entity.getOvertimeRateTier2();
        BigDecimal otHol = cmd.overtimeRateHoliday() != null ? cmd.overtimeRateHoliday() : entity.getOvertimeRateHoliday();
        String otComp = (cmd.overtimeCompensationMode() != null && !cmd.overtimeCompensationMode().isBlank())
                ? cmd.overtimeCompensationMode().trim().toUpperCase() : entity.getOvertimeCompensationMode();

        boolean etAllowed = cmd.extraTimeAllowed() != null ? cmd.extraTimeAllowed() : entity.isExtraTimeAllowed();
        int etMax = cmd.extraTimeMaxWeeklyMinutes() != null ? cmd.extraTimeMaxWeeklyMinutes() : entity.getExtraTimeMaxWeeklyMinutes();
        BigDecimal etRate = cmd.extraTimeRate() != null ? cmd.extraTimeRate() : entity.getExtraTimeRate();
        String etComp = (cmd.extraTimeCompensationMode() != null && !cmd.extraTimeCompensationMode().isBlank())
                ? cmd.extraTimeCompensationMode().trim().toUpperCase() : entity.getExtraTimeCompensationMode();

        WorkSchedulePolicy.validateOtEt(otThreshold, otTier1, otTier2, otHol, otComp, etMax, etRate, etComp);

        entity.update(
                cmd.name().trim(),
                cmd.description() != null ? cmd.description().trim() : null,
                cmd.weeklyTargetMinutes(),
                cmd.dailyTargetMinutes(),
                cmd.maxDailyMinutes(),
                cmd.maxWeeklyMinutes(),
                workingDaysStr,
                cmd.allowWeekendEntry(),
                otThreshold,
                otTier1,
                otTier2,
                otHol,
                otComp,
                etAllowed,
                etMax,
                etRate,
                etComp
        );

        entity = profileRepository.save(entity);
        return toSummary(entity);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public WorkScheduleSummary setDefault(UUID id) {
        var entity = findProfile(id);
        if (!entity.isActive()) {
            throw new WorkScheduleValidationException("Impossible de définir un profil inactif comme profil par défaut.");
        }

        entity.markAsDefault(true);
        entity = profileRepository.save(entity);
        profileRepository.resetOtherDefaults(entity.getId());
        return toSummary(entity);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('DIRECTION', 'ADMIN')")
    public WorkScheduleSummary toggleActive(UUID id) {
        var entity = findProfile(id);
        boolean newActive = !entity.isActive();

        if (!newActive) {
            WorkSchedulePolicy.ensureCanDeactivate(entity.isDefault());
        }

        entity.setActive(newActive);
        entity = profileRepository.save(entity);
        return toSummary(entity);
    }

    public WorkScheduleProfileEntity getDefaultProfile() {
        return profileRepository.findByIsDefaultTrue()
                .or(() -> profileRepository.findAll().stream().filter(WorkScheduleProfileEntity::isActive).findFirst())
                .orElseThrow(() -> new WorkScheduleValidationException("Aucun profil de temps de travail configuré."));
    }

    private WorkScheduleProfileEntity findProfile(UUID id) {
        return profileRepository.findById(id)
                .orElseThrow(() -> new WorkScheduleValidationException("Profil de temps de travail introuvable."));
    }

    private WorkScheduleSummary toSummary(WorkScheduleProfileEntity entity) {
        List<String> days = Arrays.stream(entity.getWorkingDays().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        long assigned = userRepository.countByWorkScheduleProfileId(entity.getId());

        return new WorkScheduleSummary(
                entity.getId(),
                entity.getCode(),
                entity.getName(),
                entity.getDescription(),
                entity.getWeeklyTargetMinutes(),
                entity.getDailyTargetMinutes(),
                entity.getMaxDailyMinutes(),
                entity.getMaxWeeklyMinutes(),
                days,
                entity.isAllowWeekendEntry(),
                entity.isDefault(),
                entity.isActive(),
                assigned,
                entity.getOvertimeThresholdMinutes(),
                entity.getOvertimeRateTier1(),
                entity.getOvertimeRateTier2(),
                entity.getOvertimeRateHoliday(),
                entity.getOvertimeCompensationMode(),
                entity.isExtraTimeAllowed(),
                entity.getExtraTimeMaxWeeklyMinutes(),
                entity.getExtraTimeRate(),
                entity.getExtraTimeCompensationMode(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
