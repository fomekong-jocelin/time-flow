package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.application.*;
import cm.indyli.timeflow.training.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trainings")
public class TrainingController {
    private final TrainingService trainingService;
    private final CurrentUserService currentUserService;
    public TrainingController(TrainingService trainingService, CurrentUserService currentUserService) {
        this.trainingService = trainingService;
        this.currentUserService = currentUserService;
    }
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<TrainingSessionDto> list(@RequestParam(required = false) String query,
            @RequestParam(required = false) TrainingStatus status,
            @RequestParam(required = false) TrainingCategory category,
            @RequestParam(required = false) UUID trainerId,
            @RequestParam(required = false) Boolean onlyMine, Authentication authentication) {
        return trainingService.listSessions(query, status, category, trainerId, onlyMine, principal(authentication).userId());
    }
    @GetMapping("/page")
    @PreAuthorize("isAuthenticated()")
    public TrainingPageDto page(@RequestParam(required = false) String query,
            @RequestParam(required = false) TrainingStatus status,
            @RequestParam(required = false) TrainingCategory category,
            @RequestParam(required = false) DeliveryMode deliveryMode,
            @RequestParam(required = false) UUID trainerId,
            @RequestParam(required = false) Boolean onlyMine,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "24") int size,
            Authentication authentication) {
        return trainingService.listPage(query, status, category, deliveryMode, trainerId,
                onlyMine, principal(authentication).userId(), page, size);
    }
    @GetMapping("/kpi")
    @PreAuthorize("isAuthenticated()")
    public TrainingKpiDto getKpis() { return trainingService.getKpis(); }
    @GetMapping("/users")
    @PreAuthorize("isAuthenticated()")
    public List<TrainingUserDto> getAvailableUsers() { return trainingService.getAvailableUsers(); }
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TrainingSessionDto getSession(@PathVariable UUID id, Authentication authentication) {
        return trainingService.getSession(id, principal(authentication).userId());
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto create(@Valid @RequestBody SaveTrainingCommand command, Authentication authentication) {
        return trainingService.createSession(command, principal(authentication).userId());
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto update(@PathVariable UUID id, @Valid @RequestBody SaveTrainingCommand command,
                                     Authentication authentication) {
        return trainingService.updateSession(id, command, principal(authentication).userId());
    }
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public void delete(@PathVariable UUID id) { trainingService.deleteSession(id); }
    @PostMapping("/{id}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public void registerParticipant(@PathVariable UUID id,
            @RequestBody(required = false) RegisterParticipantRequest request, Authentication authentication) {
        trainingService.registerParticipant(id, request == null ? null : request.userId(), principal(authentication));
    }
    @DeleteMapping("/{id}/participants/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void unregisterParticipant(@PathVariable UUID id, @PathVariable UUID userId, Authentication authentication) {
        trainingService.unregisterParticipant(id, userId, principal(authentication));
    }
    @PatchMapping("/{id}/participants/{userId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION', 'TRAINER')")
    public void updateParticipantStatus(@PathVariable UUID id, @PathVariable UUID userId,
            @Valid @RequestBody UpdateParticipantStatusRequest request, Authentication authentication) {
        trainingService.updateParticipantStatus(id, userId, request.status(), principal(authentication));
    }
    private TimeFlowPrincipal principal(Authentication authentication) {
        var principal = currentUserService.resolve(authentication);
        if (principal == null) throw new AccessDeniedException("Identité non résolue.");
        return principal;
    }
    public record RegisterParticipantRequest(UUID userId) {}
    public record UpdateParticipantStatusRequest(@NotNull ParticipantStatus status) {}
}
