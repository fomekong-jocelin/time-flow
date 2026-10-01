package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import java.util.UUID;

public record TrainingUserDto(
        UUID id,
        String displayName,
        String email,
        UserRole role
) {}
