package cm.indyli.timeflow.workschedule.application;

import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.workschedule.domain.WorkSchedulePolicy;
import cm.indyli.timeflow.workschedule.domain.WorkScheduleValidationException;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                cmd.isDefault()
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

        entity.update(
                cmd.name().trim(),
                cmd.description() != null ? cmd.description().trim() : null,
                cmd.weeklyTargetMinutes(),
                cmd.dailyTargetMinutes(),
                cmd.maxDailyMinutes(),
                cmd.maxWeeklyMinutes(),
                workingDaysStr,
                cmd.allowWeekendEntry()
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
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
