package cm.indyli.timeflow.users.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.domain.AccountType;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.users.application.UserAdministrationService;
import cm.indyli.timeflow.users.application.UserDirectoryService;
import cm.indyli.timeflow.users.application.UserProfileChange;
import cm.indyli.timeflow.users.application.UserSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static cm.indyli.timeflow.auth.persistence.AppUserEntity.DEFAULT_WEEKLY_TARGET_MINUTES;
import static cm.indyli.timeflow.users.domain.UserAdministrationPolicy.MAX_WEEKLY_TARGET_MINUTES;

/**
 * Administration of SSO and local accounts. Access restricted to ADMIN by SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
public class UserAdminController {

    private final UserDirectoryService directory;
    private final UserAdministrationService administration;
    private final CurrentUserService currentUserService;

    public UserAdminController(UserDirectoryService directory,
                               UserAdministrationService administration,
                               CurrentUserService currentUserService) {
        this.directory = directory;
        this.administration = administration;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<UserSummary> list() {
        return directory.list();
    }

    @PostMapping("/local")
    @ResponseStatus(HttpStatus.CREATED)
    public LocalUserResponse createLocalUser(@Valid @RequestBody CreateLocalUserRequest request, Authentication authentication) {
        var user = administration.createLocal(actor(authentication), request.email(), request.profile(), request.password());
        return LocalUserResponse.from(user);
    }

    @PostMapping("/sso")
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummary inviteSsoUser(@Valid @RequestBody InviteSsoUserRequest request, Authentication authentication) {
        var user = administration.inviteSso(actor(authentication), request.email(), request.profile());
        return directory.get(user.getId());
    }

    @PutMapping("/{id}")
    public UserSummary update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request, Authentication authentication) {
        administration.updateProfile(actor(authentication), id, request.profile());
        return directory.get(id);
    }

    @PutMapping("/{id}/active")
    public UserSummary changeActive(@PathVariable UUID id, @Valid @RequestBody ActiveRequest request, Authentication authentication) {
        administration.changeActive(actor(authentication), id, request.active());
        return directory.get(id);
    }

    @PostMapping("/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable UUID id, @Valid @RequestBody PasswordResetRequest request, Authentication authentication) {
        administration.resetLocalPassword(actor(authentication), id, request.password());
    }

    @PostMapping("/{id}/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlock(@PathVariable UUID id, Authentication authentication) {
        administration.unlockLocal(actor(authentication), id);
    }

    private UUID actor(Authentication authentication) {
        return currentUserService.resolve(authentication).userId();
    }

    private static int targetOrDefault(Integer weeklyTargetMinutes) {
        return weeklyTargetMinutes == null ? DEFAULT_WEEKLY_TARGET_MINUTES : weeklyTargetMinutes;
    }

    public record CreateLocalUserRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 200) String displayName,
            @NotNull UserRole role,
            @NotBlank @Size(min = 12, max = 128) String password,
            UUID managerId,
            @Min(0) @Max(MAX_WEEKLY_TARGET_MINUTES) Integer weeklyTargetMinutes,
            UUID workScheduleProfileId
    ) {
        UserProfileChange profile() {
            return new UserProfileChange(displayName, role, managerId, targetOrDefault(weeklyTargetMinutes), workScheduleProfileId);
        }
    }

    public record InviteSsoUserRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 200) String displayName,
            @NotNull UserRole role,
            UUID managerId,
            @Min(0) @Max(MAX_WEEKLY_TARGET_MINUTES) Integer weeklyTargetMinutes,
            UUID workScheduleProfileId
    ) {
        UserProfileChange profile() {
            return new UserProfileChange(displayName, role, managerId, targetOrDefault(weeklyTargetMinutes), workScheduleProfileId);
        }
    }

    public record UpdateUserRequest(
            @NotBlank @Size(max = 200) String displayName,
            @NotNull UserRole role,
            UUID managerId,
            @NotNull @Min(0) @Max(MAX_WEEKLY_TARGET_MINUTES) Integer weeklyTargetMinutes,
            UUID workScheduleProfileId
    ) {
        UserProfileChange profile() {
            return new UserProfileChange(displayName, role, managerId, weeklyTargetMinutes, workScheduleProfileId);
        }
    }

    public record ActiveRequest(@NotNull Boolean active) {
    }

    public record PasswordResetRequest(@NotBlank @Size(min = 12, max = 128) String password) {
    }

    public record LocalUserResponse(UUID id, String email, String displayName, UserRole role,
                                    AccountType accountType, UUID managerId, int weeklyTargetMinutes) {
        static LocalUserResponse from(AppUserEntity user) {
            return new LocalUserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                    user.getAccountType(), user.getManagerId(), user.getWeeklyTargetMinutes());
        }
    }
}
