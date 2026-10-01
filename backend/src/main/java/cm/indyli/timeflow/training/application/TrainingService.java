package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.training.domain.ParticipantStatus;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import cm.indyli.timeflow.training.domain.TrainingValidationException;
import cm.indyli.timeflow.training.persistence.TrainingParticipantEntity;
import cm.indyli.timeflow.training.persistence.TrainingParticipantRepository;
import cm.indyli.timeflow.training.persistence.TrainingSessionEntity;
import cm.indyli.timeflow.training.persistence.TrainingSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class TrainingService {

    private final TrainingSessionRepository sessionRepository;
    private final TrainingParticipantRepository participantRepository;
    private final AppUserRepository userRepository;

    public TrainingService(
            TrainingSessionRepository sessionRepository,
            TrainingParticipantRepository participantRepository,
            AppUserRepository userRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TrainingSessionDto> listSessions(
            String query,
            TrainingStatus status,
            TrainingCategory category,
            UUID trainerId,
            Boolean onlyMine,
            UUID currentUserId
    ) {
        List<TrainingSessionEntity> sessions = sessionRepository.findAllByOrderByStartDateDesc();

        if (status != null) {
            sessions = sessions.stream().filter(s -> s.getStatus() == status).toList();
        }
        if (category != null) {
            sessions = sessions.stream().filter(s -> s.getCategory() == category).toList();
        }
        if (trainerId != null) {
            sessions = sessions.stream().filter(s -> Objects.equals(s.getTrainerId(), trainerId)).toList();
        }
        if (query != null && !query.isBlank()) {
            String lower = query.trim().toLowerCase();
            sessions = sessions.stream()
                    .filter(s -> s.getTitle().toLowerCase().contains(lower)
                            || s.getReference().toLowerCase().contains(lower)
                            || (s.getDescription() != null && s.getDescription().toLowerCase().contains(lower))
                            || (s.getLocation() != null && s.getLocation().toLowerCase().contains(lower)))
                    .toList();
        }

        // Cache all users for display names
        Map<UUID, AppUserEntity> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity(), (a, b) -> a));

        // Get registrations of current user
        Set<UUID> currentUserRegisteredSessionIds = currentUserId != null
                ? participantRepository.findByUserId(currentUserId).stream()
                .filter(p -> p.getStatus() != ParticipantStatus.CANCELLED)
                .map(TrainingParticipantEntity::getTrainingId)
                .collect(Collectors.toSet())
                : Set.of();

        if (Boolean.TRUE.equals(onlyMine) && currentUserId != null) {
            sessions = sessions.stream()
                    .filter(s -> Objects.equals(s.getTrainerId(), currentUserId) || currentUserRegisteredSessionIds.contains(s.getId()))
                    .toList();
        }

        return sessions.stream()
                .map(s -> toDto(s, usersById, currentUserId, currentUserRegisteredSessionIds.contains(s.getId()), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public TrainingSessionDto getSession(UUID id, UUID currentUserId) {
        TrainingSessionEntity session = sessionRepository.findById(id)
                .orElseThrow(() -> new TrainingValidationException("Session de formation introuvable."));

        Map<UUID, AppUserEntity> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity(), (a, b) -> a));

        boolean isRegistered = currentUserId != null && participantRepository.existsByTrainingIdAndUserId(id, currentUserId);

        return toDto(session, usersById, currentUserId, isRegistered, true);
    }

    @Transactional(readOnly = true)
    public TrainingKpiDto getKpis() {
        List<TrainingSessionEntity> all = sessionRepository.findAll();
        long totalSessions = all.size();
        long planned = all.stream().filter(s -> s.getStatus() == TrainingStatus.PLANNED).count();
        long inProgress = all.stream().filter(s -> s.getStatus() == TrainingStatus.IN_PROGRESS).count();
        long completed = all.stream().filter(s -> s.getStatus() == TrainingStatus.COMPLETED).count();

        BigDecimal totalHours = all.stream()
                .map(TrainingSessionEntity::getDurationHours)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalRegistrations = participantRepository.count();

        return new TrainingKpiDto(totalSessions, planned, inProgress, completed, totalHours, totalRegistrations);
    }

    public TrainingSessionDto createSession(SaveTrainingCommand command, UUID currentUserId) {
        validateCommand(command, null);

        var entity = TrainingSessionEntity.create(
                command.reference(),
                command.title(),
                command.description(),
                command.trainerId(),
                command.location(),
                command.deliveryMode(),
                command.category(),
                command.status(),
                command.startDate(),
                command.endDate(),
                command.durationHours(),
                command.maxParticipants()
        );

        sessionRepository.save(entity);

        Map<UUID, AppUserEntity> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity(), (a, b) -> a));

        return toDto(entity, usersById, currentUserId, false, false);
    }

    public TrainingSessionDto updateSession(UUID id, SaveTrainingCommand command, UUID currentUserId) {
        TrainingSessionEntity entity = sessionRepository.findById(id)
                .orElseThrow(() -> new TrainingValidationException("Session de formation introuvable."));

        validateCommand(command, id);

        entity.update(
                command.reference(),
                command.title(),
                command.description(),
                command.trainerId(),
                command.location(),
                command.deliveryMode(),
                command.category(),
                command.status(),
                command.startDate(),
                command.endDate(),
                command.durationHours(),
                command.maxParticipants()
        );

        Map<UUID, AppUserEntity> usersById = userRepository.findAll().stream()
                .collect(Collectors.toMap(AppUserEntity::getId, Function.identity(), (a, b) -> a));

        boolean isRegistered = currentUserId != null && participantRepository.existsByTrainingIdAndUserId(id, currentUserId);

        return toDto(entity, usersById, currentUserId, isRegistered, true);
    }

    public void deleteSession(UUID id) {
        if (!sessionRepository.existsById(id)) {
            throw new TrainingValidationException("Session de formation introuvable.");
        }
        sessionRepository.deleteById(id);
    }

    public void registerParticipant(UUID sessionId, UUID userId) {
        TrainingSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new TrainingValidationException("Session de formation introuvable."));

        if (session.getStatus() == TrainingStatus.CANCELLED) {
            throw new TrainingValidationException("Impossible de s'inscrire à une formation annulée.");
        }
        if (session.getStatus() == TrainingStatus.COMPLETED) {
            throw new TrainingValidationException("Cette formation est déjà terminée.");
        }

        if (participantRepository.existsByTrainingIdAndUserId(sessionId, userId)) {
            throw new TrainingValidationException("Le collaborateur est déjà inscrit à cette formation.");
        }

        long activeCount = participantRepository.countByTrainingIdAndStatus(sessionId, ParticipantStatus.REGISTERED);
        if (activeCount >= session.getMaxParticipants()) {
            throw new TrainingValidationException("La capacité maximale (" + session.getMaxParticipants() + " participants) est atteinte.");
        }

        var participant = TrainingParticipantEntity.create(sessionId, userId, ParticipantStatus.REGISTERED);
        participantRepository.save(participant);
    }

    public void unregisterParticipant(UUID sessionId, UUID userId) {
        if (!participantRepository.existsByTrainingIdAndUserId(sessionId, userId)) {
            throw new TrainingValidationException("Le collaborateur n'est pas inscrit à cette formation.");
        }
        participantRepository.deleteByTrainingIdAndUserId(sessionId, userId);
    }

    public void updateParticipantStatus(UUID sessionId, UUID userId, ParticipantStatus status) {
        TrainingParticipantEntity participant = participantRepository.findByTrainingIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new TrainingValidationException("Inscription introuvable."));

        participant.setStatus(status);
        participantRepository.save(participant);
    }

    private void validateCommand(SaveTrainingCommand command, UUID existingId) {
        if (command.startDate().isAfter(command.endDate())) {
            throw new TrainingValidationException("La date de début doit précéder ou être égale à la date de fin.");
        }

        boolean exists = existingId == null
                ? sessionRepository.existsByReferenceIgnoreCase(command.reference())
                : sessionRepository.existsByReferenceIgnoreCaseAndIdNot(command.reference(), existingId);

        if (exists) {
            throw new TrainingValidationException("Une formation avec la référence « " + command.reference() + " » existe déjà.");
        }

        if (command.trainerId() != null && !userRepository.existsById(command.trainerId())) {
            throw new TrainingValidationException("Le formateur assigné est introuvable.");
        }
    }

    private TrainingSessionDto toDto(
            TrainingSessionEntity session,
            Map<UUID, AppUserEntity> usersById,
            UUID currentUserId,
            boolean isCurrentUserRegistered,
            boolean includeParticipants
    ) {
        AppUserEntity trainer = session.getTrainerId() != null ? usersById.get(session.getTrainerId()) : null;
        String trainerName = trainer != null ? trainer.getDisplayName() : null;
        String trainerEmail = trainer != null ? trainer.getEmail() : null;

        List<TrainingParticipantDto> participantDtos = Collections.emptyList();
        int registeredCount = 0;

        if (includeParticipants) {
            List<TrainingParticipantEntity> participants = participantRepository.findByTrainingId(session.getId());
            registeredCount = (int) participants.stream()
                    .filter(p -> p.getStatus() != ParticipantStatus.CANCELLED)
                    .count();
            participantDtos = participants.stream()
                    .map(p -> {
                        AppUserEntity user = usersById.get(p.getUserId());
                        return new TrainingParticipantDto(
                                p.getId(),
                                p.getUserId(),
                                user != null ? user.getDisplayName() : "Inconnu",
                                user != null ? user.getEmail() : "",
                                p.getStatus(),
                                p.getRegisteredAt()
                        );
                    })
                    .toList();
        } else {
            registeredCount = (int) participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED);
        }

        boolean isCurrentUserTrainer = currentUserId != null && Objects.equals(session.getTrainerId(), currentUserId);

        return new TrainingSessionDto(
                session.getId(),
                session.getReference(),
                session.getTitle(),
                session.getDescription(),
                session.getTrainerId(),
                trainerName,
                trainerEmail,
                session.getLocation(),
                session.getDeliveryMode(),
                session.getCategory(),
                session.getStatus(),
                session.getStartDate(),
                session.getEndDate(),
                session.getDurationHours(),
                session.getMaxParticipants(),
                registeredCount,
                isCurrentUserRegistered,
                isCurrentUserTrainer,
                participantDtos,
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}
