package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.training.application.CorrectTrainingParticipantCommand;
import cm.indyli.timeflow.training.application.TrainingParticipantCorrectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trainings/{id}/participants/{userId}/corrections")
public class TrainingParticipantCorrectionController {
    private final TrainingParticipantCorrectionService corrections;
    private final CurrentUserService currentUser;

    public TrainingParticipantCorrectionController(TrainingParticipantCorrectionService corrections,
                                                   CurrentUserService currentUser) {
        this.corrections = corrections;
        this.currentUser = currentUser;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public void correct(@PathVariable UUID id, @PathVariable UUID userId,
                        @Valid @RequestBody CorrectTrainingParticipantCommand command,
                        Authentication authentication) {
        corrections.correct(id, userId, command, currentUser.resolve(authentication));
    }
}
