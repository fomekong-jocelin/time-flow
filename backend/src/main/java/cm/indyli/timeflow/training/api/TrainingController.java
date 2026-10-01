package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.application.SaveTrainingCommand;
import cm.indyli.timeflow.training.application.TrainingKpiDto;
import cm.indyli.timeflow.training.application.TrainingService;
import cm.indyli.timeflow.training.application.TrainingSessionDto;
import cm.indyli.timeflow.training.application.TrainingUserDto;
import cm.indyli.timeflow.training.domain.ParticipantStatus;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import cm.indyli.timeflow.training.domain.TrainingValidationException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    public List<TrainingSessionDto> list(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) TrainingStatus status,
            @RequestParam(required = false) TrainingCategory category,
            @RequestParam(required = false) UUID trainerId,
            @RequestParam(required = false) Boolean onlyMine,
            Authentication authentication
    ) {
        UUID currentUserId = resolveUserId(authentication);
        return trainingService.listSessions(query, status, category, trainerId, onlyMine, currentUserId);
    }

    @GetMapping("/kpi")
    @PreAuthorize("isAuthenticated()")
    public TrainingKpiDto getKpis() {
        return trainingService.getKpis();
    }

    @GetMapping("/users")
    @PreAuthorize("isAuthenticated()")
    public List<TrainingUserDto> getAvailableUsers() {
        return trainingService.getAvailableUsers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public TrainingSessionDto getSession(@PathVariable UUID id, Authentication authentication) {
        UUID currentUserId = resolveUserId(authentication);
        return trainingService.getSession(id, currentUserId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto create(@Valid @RequestBody SaveTrainingCommand command, Authentication authentication) {
        UUID currentUserId = resolveUserId(authentication);
        return trainingService.createSession(command, currentUserId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto update(
            @PathVariable UUID id,
            @Valid @RequestBody SaveTrainingCommand command,
            Authentication authentication
    ) {
        UUID currentUserId = resolveUserId(authentication);
        return trainingService.updateSession(id, command, currentUserId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public void delete(@PathVariable UUID id) {
        trainingService.deleteSession(id);
    }

    @PostMapping("/{id}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public void registerParticipant(
            @PathVariable UUID id,
            @RequestBody(required = false) RegisterParticipantRequest request,
            Authentication authentication
    ) {
        TimeFlowPrincipal principal = resolvePrincipal(authentication);
        UUID targetUserId = principal.userId();

        if (request != null && request.userId() != null) {
            boolean canManage = principal.role() == UserRole.ADMIN || principal.role() == UserRole.DIRECTION;
            if (!canManage && !principal.userId().equals(request.userId())) {
                throw new TrainingValidationException("Vous ne pouvez pas inscrire un autre collaborateur.");
            }
            targetUserId = request.userId();
        }

        trainingService.registerParticipant(id, targetUserId);
    }

    @DeleteMapping("/{id}/participants/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void unregisterParticipant(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            Authentication authentication
    ) {
        TimeFlowPrincipal principal = resolvePrincipal(authentication);
        boolean canManage = principal.role() == UserRole.ADMIN || principal.role() == UserRole.DIRECTION;
        if (!canManage && !principal.userId().equals(userId)) {
            throw new TrainingValidationException("Vous ne pouvez pas désinscrire un autre collaborateur.");
        }

        trainingService.unregisterParticipant(id, userId);
    }

    @PatchMapping("/{id}/participants/{userId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION', 'TRAINER')")
    public void updateParticipantStatus(
            @PathVariable UUID id,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateParticipantStatusRequest request
    ) {
        trainingService.updateParticipantStatus(id, userId, request.status());
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) return null;
        try {
            return currentUserService.resolve(authentication).userId();
        } catch (Exception e) {
            return null;
        }
    }

    private TimeFlowPrincipal resolvePrincipal(Authentication authentication) {
        return currentUserService.resolve(authentication);
    }

    public record RegisterParticipantRequest(UUID userId) {}
    public record UpdateParticipantStatusRequest(ParticipantStatus status) {}
}
