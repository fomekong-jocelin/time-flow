package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class TrainingService {
    private final TrainingSessionRepository sessionRepository;
    private final TrainingParticipantRepository participantRepository;
    private final AppUserRepository userRepository;

    public TrainingService(TrainingSessionRepository sessions, TrainingParticipantRepository participants,
                           AppUserRepository users) {
        this.sessionRepository = sessions;
        this.participantRepository = participants;
        this.userRepository = users;
    }

    /** Legacy array contract retained. New consumers use the bounded listPage endpoint. */
    @Transactional(readOnly = true)
    public List<TrainingSessionDto> listSessions(String query, TrainingStatus status, TrainingCategory category,
            UUID trainerId, Boolean onlyMine, UUID currentUserId) {
        if (query != null && query.length() > 200) throw error("invalid", "Paramètres de recherche invalides.");
        var sessions = sessionRepository.findAll(TrainingSpecifications.matching(query, status, category, null,
                trainerId, Boolean.TRUE.equals(onlyMine), currentUserId),
                Sort.by(Sort.Order.desc("startDate"), Sort.Order.asc("id")));
        return listDtos(sessions, currentUserId);
    }

    @Transactional(readOnly = true)
    public TrainingPageDto listPage(String query, TrainingStatus status, TrainingCategory category,
            DeliveryMode mode, UUID trainerId, Boolean onlyMine, UUID currentUserId, int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (query != null && query.length() > 200)) {
            throw error("invalid", "Paramètres de recherche invalides.");
        }
        var result = sessionRepository.findAll(
                TrainingSpecifications.matching(query, status, category, mode, trainerId,
                        Boolean.TRUE.equals(onlyMine), currentUserId),
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("startDate"), Sort.Order.asc("id"))));
        return new TrainingPageDto(listDtos(result.getContent(), currentUserId), page, size,
                result.getTotalElements(), result.getTotalPages());
    }

    private List<TrainingSessionDto> listDtos(List<TrainingSessionEntity> sessions, UUID currentUserId) {
        List<UUID> ids = sessions.stream().map(TrainingSessionEntity::getId).toList();
        if (ids.isEmpty()) return List.of();
        Map<UUID, Long> counts = participantRepository.countOccupiedByTrainingIds(ids, ParticipantStatus.CANCELLED)
                .stream().collect(Collectors.toMap(TrainingParticipantRepository.Occupancy::getTrainingId,
                        TrainingParticipantRepository.Occupancy::getTotal));
        Map<UUID, ParticipantStatus> mine = currentUserId == null ? Map.of() :
                participantRepository.findByUserIdAndTrainingIdIn(currentUserId, ids).stream()
                        .collect(Collectors.toMap(TrainingParticipantEntity::getTrainingId, TrainingParticipantEntity::getStatus));
        Set<UUID> trainerIds = sessions.stream().map(TrainingSessionEntity::getTrainerId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        var users = usersById(trainerIds);
        return sessions.stream().map(session -> toDto(session, users, currentUserId, mine.get(session.getId()),
                Math.toIntExact(counts.getOrDefault(session.getId(), 0L)), List.of())).toList();
    }

    @Transactional(readOnly = true)
    public TrainingSessionDto getSession(UUID id, UUID currentUserId) {
        var session = sessionRepository.findById(id).orElseThrow(() -> error("notFound", "Session de formation introuvable."));
        return detail(session, currentUserId);
    }

    @Transactional(readOnly = true)
    public TrainingKpiDto getKpis() {
        return new TrainingKpiDto(sessionRepository.count(),
                sessionRepository.countByStatus(TrainingStatus.PLANNED),
                sessionRepository.countByStatus(TrainingStatus.IN_PROGRESS),
                sessionRepository.countByStatus(TrainingStatus.COMPLETED),
                sessionRepository.sumPlannedHours(TrainingStatus.CANCELLED),
                participantRepository.countActiveRegistrations(ParticipantStatus.CANCELLED, TrainingStatus.CANCELLED));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto createSession(SaveTrainingCommand command, UUID currentUserId) {
        validateCommand(command, null);
        var session = TrainingSessionEntity.create(command.reference(), command.title(), command.description(),
                command.trainerId(), command.location(), command.deliveryMode(), command.category(), command.status(),
                command.startDate(), command.endDate(), command.durationHours(), command.maxParticipants());
        session.schedule(command.startsAt(), command.endsAt(), command.timeZone());
        sessionRepository.save(session);
        return detail(session, currentUserId);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public TrainingSessionDto updateSession(UUID id, SaveTrainingCommand command, UUID currentUserId) {
        var session = locked(id);
        requireMutable(session);
        validateCommand(command, id);
        if (command.maxParticipants() < occupiedCount(id)) throw error("capacityBelowOccupancy", "La capacité est inférieure aux inscriptions actives.");
        session.update(command.reference(), command.title(), command.description(), command.trainerId(),
                command.location(), command.deliveryMode(), command.category(), command.status(), command.startDate(),
                command.endDate(), command.durationHours(), command.maxParticipants());
        session.schedule(command.startsAt(), command.endsAt(), command.timeZone());
        return detail(session, currentUserId);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTION')")
    public void deleteSession(UUID id) {
        var session = locked(id);
        if (session.getStatus() == TrainingStatus.COMPLETED || participantRepository.existsByTrainingId(id)) {
            throw error("historyProtected", "Cette session possède un historique à conserver. Annulez-la au lieu de la supprimer.");
        }
        sessionRepository.delete(session);
    }

    public void registerParticipant(UUID sessionId, UUID requestedUserId, TimeFlowPrincipal actor) {
        UUID userId = requestedUserId == null && actor != null ? actor.userId() : requestedUserId;
        TrainingAccess.requireSelfOrManager(actor, userId);
        var session = locked(sessionId);
        requireEnrollmentOpen(session);
        requireActiveUser(userId);
        var existing = participantRepository.findByTrainingIdAndUserId(sessionId, userId);
        if (existing.isPresent() && existing.get().getStatus() != ParticipantStatus.CANCELLED) return;
        requireFreePlace(session);
        if (existing.isPresent()) {
            existing.get().changeStatus(ParticipantStatus.REGISTERED, actor.userId());
            participantRepository.save(existing.get());
        } else {
            participantRepository.save(TrainingParticipantEntity.create(sessionId, userId, ParticipantStatus.REGISTERED, actor.userId()));
        }
    }

    public void unregisterParticipant(UUID sessionId, UUID userId, TimeFlowPrincipal actor) {
        TrainingAccess.requireSelfOrManager(actor, userId);
        var session = locked(sessionId);
        requireMutable(session);
        var existing = participantRepository.findByTrainingIdAndUserId(sessionId, userId);
        if (existing.isEmpty() || existing.get().getStatus() == ParticipantStatus.CANCELLED) return;
        if (existing.get().getStatus() == ParticipantStatus.ATTENDED) {
            throw error("historyProtected", "Une présence enregistrée ne peut pas être supprimée par désinscription.");
        }
        existing.get().changeStatus(ParticipantStatus.CANCELLED, actor.userId());
        participantRepository.save(existing.get());
    }

    public void updateParticipantStatus(UUID sessionId, UUID userId, ParticipantStatus status, TimeFlowPrincipal actor) {
        var session = locked(sessionId);
        TrainingAccess.requireAttendance(session, actor);
        if (status == null) throw error("invalid", "Le statut est obligatoire.");
        var participant = participantRepository.findByTrainingIdAndUserId(sessionId, userId)
                .orElseThrow(() -> error("notRegistered", "Inscription introuvable."));
        if (participant.getStatus() == status) return;
        requireMutable(session);
        if (participant.getStatus() == ParticipantStatus.ATTENDED) {
            throw error("historyProtected", "Une présence enregistrée est conservée.");
        }
        if (status == ParticipantStatus.REGISTERED) {
            requireEnrollmentOpen(session);
            requireActiveUser(userId);
            requireFreePlace(session);
        } else if (status == ParticipantStatus.ATTENDED) {
            if (session.getStatus() != TrainingStatus.IN_PROGRESS || participant.getStatus() != ParticipantStatus.REGISTERED) {
                throw error("attendanceNotOpen", "La présence requiert une inscription active et une session en cours.");
            }
        }
        participant.changeStatus(status, actor.userId());
        participantRepository.save(participant);
    }

    @Transactional(readOnly = true)
    public List<TrainingUserDto> getAvailableUsers() {
        return userRepository.findAllByOrderByDisplayNameAsc().stream().filter(AppUserEntity::isActive)
                .map(u -> new TrainingUserDto(u.getId(), u.getDisplayName(), u.getEmail(), u.getRole())).toList();
    }

    private TrainingSessionEntity locked(UUID id) {
        return sessionRepository.lockById(id).orElseThrow(() -> error("notFound", "Session de formation introuvable."));
    }
    private long occupiedCount(UUID id) {
        return participantRepository.countByTrainingIdAndStatus(id, ParticipantStatus.REGISTERED)
                + participantRepository.countByTrainingIdAndStatus(id, ParticipantStatus.ATTENDED);
    }
    private void requireFreePlace(TrainingSessionEntity session) {
        if (occupiedCount(session.getId()) >= session.getMaxParticipants()) {
            throw error("full", "La capacité maximale de la formation est atteinte.");
        }
    }
    private void requireMutable(TrainingSessionEntity session) {
        if (session.getStatus() == TrainingStatus.COMPLETED || session.getStatus() == TrainingStatus.CANCELLED) {
            throw error("closed", "Cette session est clôturée ou annulée.");
        }
    }
    private void requireEnrollmentOpen(TrainingSessionEntity session) {
        requireMutable(session);
        boolean ended = session.getEndsAt() != null ? !session.getEndsAt().toInstant().isAfter(Instant.now())
                : session.getEndDate().isBefore(LocalDate.now(ZoneOffset.UTC));
        if (ended) throw error("closed", "La période d'inscription à cette session est terminée.");
    }
    private AppUserEntity requireActiveUser(UUID userId) {
        if (userId == null) throw error("userUnavailable", "Utilisateur indisponible.");
        return userRepository.findById(userId).filter(AppUserEntity::isActive)
                .orElseThrow(() -> error("userUnavailable", "Utilisateur indisponible."));
    }
    private void validateCommand(SaveTrainingCommand command, UUID existingId) {
        if (command == null || command.reference() == null || command.reference().isBlank()
                || command.reference().length() > 50 || command.title() == null || command.title().isBlank()
                || command.title().length() > 200 || (command.description() != null && command.description().length() > 2000)
                || (command.location() != null && command.location().length() > 200)
                || command.startDate() == null || command.endDate() == null || command.deliveryMode() == null
                || command.category() == null || command.status() == null || command.durationHours() == null
                || command.durationHours().compareTo(new BigDecimal("0.5")) < 0
                || command.durationHours().compareTo(new BigDecimal("9999.99")) > 0
                || command.durationHours().stripTrailingZeros().scale() > 2
                || command.maxParticipants() < 1 || command.maxParticipants() > 500) {
            throw error("invalid", "Valeurs de formation invalides.");
        }
        if (command.startDate().isAfter(command.endDate())) throw error("datesInvalid", "La date de début doit précéder la date de fin.");
        validateSchedule(command);
        String reference = command.reference().trim();
        boolean exists = existingId == null ? sessionRepository.existsByReferenceIgnoreCase(reference)
                : sessionRepository.existsByReferenceIgnoreCaseAndIdNot(reference, existingId);
        if (exists) throw error("duplicateReference", "Une formation avec cette référence existe déjà.");
        if (command.trainerId() != null) {
            var trainer = requireActiveUser(command.trainerId());
            if (!Set.of(UserRole.TRAINER, UserRole.ADMIN, UserRole.DIRECTION).contains(trainer.getRole())) {
                throw error("trainerInvalid", "L'utilisateur affecté ne possède pas les droits de formateur.");
            }
        }
    }
    private void validateSchedule(SaveTrainingCommand command) {
        if (command.startsAt() == null && command.endsAt() == null && command.timeZone() == null) return;
        try {
            if (command.startsAt() == null || command.endsAt() == null || command.timeZone() == null
                    || command.timeZone().isBlank() || command.timeZone().length() > 64 || !command.endsAt().isAfter(command.startsAt())) {
                throw error("datesInvalid", "Les horaires et le fuseau doivent être fournis ensemble.");
            }
            var zone = ZoneId.of(command.timeZone());
            if (!command.startsAt().atZoneSameInstant(zone).toLocalDate().equals(command.startDate())
                    || !command.endsAt().atZoneSameInstant(zone).toLocalDate().equals(command.endDate())) {
                throw error("datesInvalid", "Les dates ne correspondent pas aux horaires dans le fuseau indiqué.");
            }
        } catch (DateTimeException e) {
            throw error("datesInvalid", "Fuseau horaire invalide.");
        }
    }
    private Map<UUID, AppUserEntity> usersById(Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(AppUserEntity::getId, Function.identity()));
    }
    private TrainingSessionDto detail(TrainingSessionEntity session, UUID currentUserId) {
        var participants = participantRepository.findByTrainingId(session.getId());
        Set<UUID> ids = participants.stream().map(TrainingParticipantEntity::getUserId).collect(Collectors.toSet());
        if (session.getTrainerId() != null) ids.add(session.getTrainerId());
        var users = usersById(ids);
        var dtos = participants.stream().map(p -> {
            var user = users.get(p.getUserId());
            return new TrainingParticipantDto(p.getId(), p.getUserId(), user == null ? "" : user.getDisplayName(),
                    user == null ? "" : user.getEmail(), p.getStatus(), p.getRegisteredAt());
        }).toList();
        var currentStatus = participants.stream().filter(p -> p.getUserId().equals(currentUserId))
                .map(TrainingParticipantEntity::getStatus).findFirst().orElse(null);
        int count = Math.toIntExact(participants.stream().filter(p -> p.getStatus() != ParticipantStatus.CANCELLED).count());
        return toDto(session, users, currentUserId, currentStatus, count, dtos);
    }
    private TrainingSessionDto toDto(TrainingSessionEntity session, Map<UUID, AppUserEntity> users,
            UUID currentUserId, ParticipantStatus currentStatus, int count, List<TrainingParticipantDto> participants) {
        var trainer = session.getTrainerId() == null ? null : users.get(session.getTrainerId());
        return new TrainingSessionDto(session.getId(), session.getReference(), session.getTitle(), session.getDescription(),
                session.getTrainerId(), trainer == null ? null : trainer.getDisplayName(), trainer == null ? null : trainer.getEmail(),
                session.getLocation(), session.getDeliveryMode(), session.getCategory(), session.getStatus(), session.getStartDate(),
                session.getEndDate(), session.getDurationHours(), session.getMaxParticipants(), count,
                currentStatus != null && currentStatus != ParticipantStatus.CANCELLED,
                currentUserId != null && currentUserId.equals(session.getTrainerId()), participants,
                session.getCreatedAt(), session.getUpdatedAt(), session.getStartsAt(), session.getEndsAt(), session.getTimeZone(), currentStatus);
    }
    private TrainingValidationException error(String code, String message) {
        return new TrainingValidationException("training.errors." + code, message);
    }
}
