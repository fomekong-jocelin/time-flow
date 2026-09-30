package cm.indyli.timeflow.auth.api;

import cm.indyli.timeflow.auth.application.LocalUserAdminService;
import cm.indyli.timeflow.auth.domain.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {

    private final LocalUserAdminService localUserAdminService;

    public AdminUserController(LocalUserAdminService localUserAdminService) {
        this.localUserAdminService = localUserAdminService;
    }

    @PostMapping("/local")
    @ResponseStatus(HttpStatus.CREATED)
    public LocalUserResponse createLocalUser(@Valid @RequestBody CreateLocalUserRequest request) {
        var user = localUserAdminService.create(request.email(), request.displayName(), request.role(), request.password());
        return new LocalUserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole());
    }

    public record CreateLocalUserRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 200) String displayName,
            @NotNull UserRole role,
            @NotBlank @Size(min = 12, max = 128) String password
    ) {
    }

    public record LocalUserResponse(UUID id, String email, String displayName, UserRole role) {
    }
}
