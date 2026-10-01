package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.application.DuplicateUserException;
import cm.indyli.timeflow.auth.application.LocalUserAdminService;
import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityEntity;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.users.domain.UserAdministrationException;
import cm.indyli.timeflow.users.domain.UserNotFoundException;
import cm.indyli.timeflow.users.infrastructure.UserAdminAuditEntity;
import cm.indyli.timeflow.users.infrastructure.UserAdminAuditRepository;
import cm.indyli.timeflow.users.infrastructure.UserSessionRevoker;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

import static cm.indyli.timeflow.users.domain.UserAdministrationPolicy.*;

/**
 * Administrative use cases on TimeFlow accounts (SSO and local). Every change is audited.
 */
@Service
public class UserAdministrationService {

    private final AppUserRepository userRepository;
    private final AuthIdentityRepository identityRepository;
    private final LocalUserAdminService localUserAdminService;
    private final PasswordEncoder passwordEncoder;
    private final UserAdminAuditRepository auditRepository;
    private final UserSessionRevoker sessionRevoker;
    private final WorkScheduleProfileRepository workScheduleRepository;

    public UserAdministrationService(AppUserRepository userRepository,
                                     AuthIdentityRepository identityRepository,
                                     LocalUserAdminService localUserAdminService,
                                     PasswordEncoder passwordEncoder,
                                     UserAdminAuditRepository auditRepository,
                                     UserSessionRevoker sessionRevoker) {
        this(userRepository, identityRepository, localUserAdminService, passwordEncoder, auditRepository, sessionRevoker, null);
    }

    public UserAdministrationService(AppUserRepository userRepository,
                                     AuthIdentityRepository identityRepository,
                                     LocalUserAdminService localUserAdminService,
                                     PasswordEncoder passwordEncoder,
                                     UserAdminAuditRepository auditRepository,
                                     UserSessionRevoker sessionRevoker,
                                     WorkScheduleProfileRepository workScheduleRepository) {
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.localUserAdminService = localUserAdminService;
        this.passwordEncoder = passwordEncoder;
        this.auditRepository = auditRepository;
        this.sessionRevoker = sessionRevoker;
        this.workScheduleRepository = workScheduleRepository;
    }

    @Transactional
    public AppUserEntity createLocal(UUID actorId, String email, UserProfileChange profile, String password) {
        validateProfile(null, profile);
        var user = localUserAdminService.create(email, profile.displayName(), profile.role(), password);
        applyProfile(user, profile);
        audit(actorId, user, "CREATE_LOCAL", "role=" + profile.role());
        return user;
    }

    @Transactional
    public AppUserEntity inviteSso(UUID actorId, String email, UserProfileChange profile) {
        validateProfile(null, profile);
        var normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateUserException("A user with this email already exists");
        }
        var user = userRepository.save(AppUserEntity.sso(normalizedEmail, profile.displayName(), profile.role()));
        applyProfile(user, profile);
        audit(actorId, user, "INVITE_SSO", "role=" + profile.role());
        return user;
    }

    @Transactional
    public AppUserEntity updateProfile(UUID actorId, UUID userId, UserProfileChange profile) {
        var user = find(userId);
        checkSelfChange(actorId, user, profile.role(), user.isActive());
        checkAdminRemains(user, profile.role(), user.isActive(), userRepository.countByRoleAndActiveTrue(UserRole.ADMIN));
        validateProfile(userId, profile);
        var roleChanged = user.getRole() != profile.role();
        var previousRole = user.getRole();
        applyProfile(user, profile);
        audit(actorId, user, "UPDATE_PROFILE", roleChanged ? "role=" + previousRole + "->" + profile.role() : null);
        if (roleChanged) {
            revokeSessions(user);
        }
        return user;
    }

    @Transactional
    public AppUserEntity changeActive(UUID actorId, UUID userId, boolean active) {
        var user = find(userId);
        if (user.isActive() == active) {
            return user;
        }
        checkSelfChange(actorId, user, user.getRole(), active);
        checkAdminRemains(user, user.getRole(), active, userRepository.countByRoleAndActiveTrue(UserRole.ADMIN));
        user.changeActive(active);
        userRepository.save(user);
        audit(actorId, user, active ? "ACTIVATE" : "DEACTIVATE", null);
        if (!active) {
            revokeSessions(user);
        }
        return user;
    }

    @Transactional
    public void resetLocalPassword(UUID actorId, UUID userId, String password) {
        var identity = localIdentity(userId);
        identity.resetPassword(passwordEncoder.encode(password));
        identityRepository.save(identity);
        audit(actorId, identity.getUser(), "RESET_PASSWORD", null);
        revokeSessions(identity.getUser());
    }

    @Transactional
    public void unlockLocal(UUID actorId, UUID userId) {
        var identity = localIdentity(userId);
        identity.unlock();
        identityRepository.save(identity);
        audit(actorId, identity.getUser(), "UNLOCK", null);
    }

    private void validateProfile(UUID userId, UserProfileChange profile) {
        checkWeeklyTarget(profile.weeklyTargetMinutes());
        checkManager(userId, profile.managerId(), userRepository::findById);
        if (profile.workScheduleProfileId() != null && workScheduleRepository != null
                && !workScheduleRepository.existsById(profile.workScheduleProfileId())) {
            throw new UserAdministrationException("invalid_schedule_profile", "Le groupe de configuration du temps de travail spécifié n'existe pas.");
        }
    }

    private void applyProfile(AppUserEntity user, UserProfileChange profile) {
        UUID scheduleId = profile.workScheduleProfileId();
        if (scheduleId == null && user.getWorkScheduleProfileId() == null && workScheduleRepository != null) {
            scheduleId = workScheduleRepository.findByIsDefaultTrue()
                    .map(WorkScheduleProfileEntity::getId)
                    .orElse(null);
        } else if (scheduleId == null) {
            scheduleId = user.getWorkScheduleProfileId();
        }
        user.updateAdministrativeProfile(profile.displayName(), profile.role(), profile.managerId(), profile.weeklyTargetMinutes(), scheduleId);
        userRepository.save(user);
    }

    private AuthIdentityEntity localIdentity(UUID userId) {
        var user = find(userId);
        if (user.getAccountType() != AccountType.LOCAL) {
            throw new UserAdministrationException("not_local_account",
                    "Le mot de passe d'un compte SSO est géré par Microsoft Entra ID.");
        }
        return identityRepository.findByUser_IdAndProvider(userId, AuthProvider.LOCAL)
                .orElseThrow(() -> new UserAdministrationException("not_local_account", "Aucune identité locale pour ce compte."));
    }

    private AppUserEntity find(UUID userId) {
        return userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
    }

    private void revokeSessions(AppUserEntity user) {
        var entraSubject = identityRepository.findByUser_IdAndProvider(user.getId(), AuthProvider.ENTRA)
                .map(AuthIdentityEntity::getSubject).orElse(null);
        sessionRevoker.revoke(user.getEmail(), entraSubject);
    }

    private void audit(UUID actorId, AppUserEntity target, String action, String details) {
        auditRepository.save(UserAdminAuditEntity.of(actorId, target.getId(), action, details));
    }
}
