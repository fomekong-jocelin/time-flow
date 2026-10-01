package cm.indyli.timeflow.auth.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.LocalAuthenticationService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.security.SecurityAuthorities;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final LocalAuthenticationService localAuthenticationService;
    private final CurrentUserService currentUserService;
    private final SecurityContextRepository securityContextRepository;
    private final AuthProperties properties;

    public AuthController(LocalAuthenticationService localAuthenticationService,
                          CurrentUserService currentUserService,
                          SecurityContextRepository securityContextRepository,
                          AuthProperties properties) {
        this.localAuthenticationService = localAuthenticationService;
        this.currentUserService = currentUserService;
        this.securityContextRepository = securityContextRepository;
        this.properties = properties;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @GetMapping("/config")
    public AuthConfigResponse config() {
        return new AuthConfigResponse(properties.isSsoEnabled(), true);
    }

    @PostMapping("/login")
    public CurrentUserResponse login(@Valid @RequestBody LocalLoginRequest request,
                                     HttpServletRequest httpRequest,
                                     HttpServletResponse httpResponse) {
        var principal = localAuthenticationService.authenticate(request.email(), request.password());
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal,
                null,
                SecurityAuthorities.forRole(principal.role())
        );

        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        return CurrentUserResponse.from(principal);
    }

    @GetMapping("/me")
    public CurrentUserResponse me(Authentication authentication) {
        return CurrentUserResponse.from(currentUserService.resolve(authentication));
    }

    public record LocalLoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 128) String password
    ) {
    }

    public record AuthConfigResponse(boolean ssoEnabled, boolean localEnabled) {
    }

    public record CurrentUserResponse(UUID id, String email, String displayName, String role, String provider) {
        static CurrentUserResponse from(cm.indyli.timeflow.auth.security.TimeFlowPrincipal principal) {
            return new CurrentUserResponse(
                    principal.userId(), principal.email(), principal.displayName(),
                    principal.role().name(), principal.provider().name()
            );
        }
    }
}
