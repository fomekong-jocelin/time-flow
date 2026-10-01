package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.users.domain.UserNotFoundException;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class UserDirectoryService {

    private final AppUserRepository userRepository;
    private final AuthIdentityRepository identityRepository;
    private final WorkScheduleProfileRepository workScheduleRepository;

    public UserDirectoryService(AppUserRepository userRepository,
                                AuthIdentityRepository identityRepository,
                                WorkScheduleProfileRepository workScheduleRepository) {
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.workScheduleRepository = workScheduleRepository;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> list() {
        var users = userRepository.findAllByOrderByDisplayNameAsc();
        return summarize(users, users);
    }

    @Transactional(readOnly = true)
    public UserSummary get(UUID id) {
        var user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
        var managers = user.getManagerId() == null ? List.<AppUserEntity>of()
                : userRepository.findById(user.getManagerId()).stream().toList();
        return summarize(List.of(user), managers).getFirst();
    }

    private List<UserSummary> summarize(List<AppUserEntity> users, List<AppUserEntity> knownManagers) {
        var names = knownManagers.stream().collect(Collectors.toMap(AppUserEntity::getId, AppUserEntity::getDisplayName));
        Map<UUID, List<AuthIdentityEntity>> identities = identityRepository
                .findByUser_IdIn(users.stream().map(AppUserEntity::getId).toList()).stream()
                .collect(Collectors.groupingBy(identity -> identity.getUser().getId()));
        Map<UUID, String> scheduleNames = workScheduleRepository == null ? Map.of()
                : workScheduleRepository.findAll().stream()
                .collect(Collectors.toMap(WorkScheduleProfileEntity::getId, WorkScheduleProfileEntity::getName));
        var now = OffsetDateTime.now();
        return users.stream()
                .map(user -> toSummary(user, identities.getOrDefault(user.getId(), List.of()), names::get, scheduleNames::get, now))
                .toList();
    }

    private UserSummary toSummary(AppUserEntity user, List<AuthIdentityEntity> identities,
                                  Function<UUID, String> managerName,
                                  Function<UUID, String> scheduleName,
                                  OffsetDateTime now) {
        var lastLogin = identities.stream().map(AuthIdentityEntity::getLastLoginAt)
                .filter(Objects::nonNull).max(OffsetDateTime::compareTo).orElse(null);
        UUID profileId = user.getWorkScheduleProfileId();
        String profileName = profileId != null ? scheduleName.apply(profileId) : null;
        return new UserSummary(
                user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), user.getAccountType(),
                user.isActive(), user.getManagerId(),
                user.getManagerId() == null ? null : managerName.apply(user.getManagerId()),
                user.getWeeklyTargetMinutes(),
                identities.stream().anyMatch(identity -> identity.getProvider() == AuthProvider.ENTRA),
                identities.stream().anyMatch(identity -> identity.isLockedAt(now)),
                lastLogin, user.getCreatedAt(),
                profileId,
                profileName
        );
    }
}
