package cm.indyli.timeflow.training.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.training.domain.DeliveryMode;
import cm.indyli.timeflow.training.domain.ParticipantStatus;
import cm.indyli.timeflow.training.domain.TrainingCategory;
import cm.indyli.timeflow.training.domain.TrainingStatus;
import cm.indyli.timeflow.training.domain.TrainingValidationException;
import cm.indyli.timeflow.training.persistence.TrainingParticipantEntity;
import cm.indyli.timeflow.training.persistence.TrainingParticipantRepository;
import cm.indyli.timeflow.training.persistence.TrainingSessionEntity;
import cm.indyli.timeflow.training.persistence.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainingServiceTest {

    @Mock TrainingSessionRepository sessionRepository;
    @Mock TrainingParticipantRepository participantRepository;
    @Mock AppUserRepository userRepository;

    @InjectMocks TrainingService service;

    private AppUserEntity trainer;
    private AppUserEntity user1;
    private TrainingSessionEntity session;

    @BeforeEach
    void setUp() {
        trainer = AppUserEntity.local("trainer@example.com", "Formateur Expert", UserRole.TRAINER);
        user1 = AppUserEntity.local("collab@example.com", "Collaborateur Apprenant", UserRole.COLLABORATOR);

        session = TrainingSessionEntity.create(
                "TRN-ANG-01",
                "Angular 22 Avancé",
                "Perfectionnement Angular",
                trainer.getId(),
                "Paris",
                DeliveryMode.HYBRID,
                TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED,
                LocalDate.of(2026, 10, 15),
                LocalDate.of(2026, 10, 16),
                BigDecimal.valueOf(14.0),
                5
        );
    }

    @Test
    @DisplayName("Création d'une session de formation valide")
    void createSessionSuccess() {
        when(sessionRepository.existsByReferenceIgnoreCase("TRN-NEW-01")).thenReturn(false);
        when(userRepository.findAll()).thenReturn(List.of(trainer));
        when(sessionRepository.save(any(TrainingSessionEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        var cmd = new SaveTrainingCommand(
                "TRN-NEW-01",
                "Nouvelle Formation",
                "Description",
                trainer.getId(),
                "Teams",
                DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 2),
                BigDecimal.valueOf(14.0),
                10
        );

        when(userRepository.existsById(trainer.getId())).thenReturn(true);

        var result = service.createSession(cmd, user1.getId());

        assertThat(result).isNotNull();
        assertThat(result.reference()).isEqualTo("TRN-NEW-01");
        assertThat(result.title()).isEqualTo("Nouvelle Formation");
        assertThat(result.trainerDisplayName()).isEqualTo("Formateur Expert");
        verify(sessionRepository).save(any(TrainingSessionEntity.class));
    }

    @Test
    @DisplayName("Refus de création si la référence existe déjà")
    void createSessionDuplicateReferenceThrows() {
        when(sessionRepository.existsByReferenceIgnoreCase("TRN-ANG-01")).thenReturn(true);

        var cmd = new SaveTrainingCommand(
                "TRN-ANG-01",
                "Doublon",
                null,
                null,
                null,
                DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 11, 2),
                BigDecimal.valueOf(7.0),
                10
        );

        assertThatThrownBy(() -> service.createSession(cmd, user1.getId()))
                .isInstanceOf(TrainingValidationException.class)
                .hasMessageContaining("existe déjà");
    }

    @Test
    @DisplayName("Refus si date de début postérieure à la date de fin")
    void createSessionInvalidDatesThrows() {
        var cmd = new SaveTrainingCommand(
                "TRN-ERR-01",
                "Dates Invalides",
                null,
                null,
                null,
                DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL,
                TrainingStatus.PLANNED,
                LocalDate.of(2026, 11, 10),
                LocalDate.of(2026, 11, 5),
                BigDecimal.valueOf(7.0),
                10
        );

        assertThatThrownBy(() -> service.createSession(cmd, user1.getId()))
                .isInstanceOf(TrainingValidationException.class)
                .hasMessageContaining("date de début");
    }

    @Test
    @DisplayName("Inscription d'un participant réussie")
    void registerParticipantSuccess() {
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(participantRepository.existsByTrainingIdAndUserId(session.getId(), user1.getId())).thenReturn(false);
        when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED)).thenReturn(2L);

        service.registerParticipant(session.getId(), user1.getId());

        verify(participantRepository).save(any(TrainingParticipantEntity.class));
    }

    @Test
    @DisplayName("Refus d'inscription si déjà inscrit")
    void registerParticipantAlreadyRegisteredThrows() {
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(participantRepository.existsByTrainingIdAndUserId(session.getId(), user1.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.registerParticipant(session.getId(), user1.getId()))
                .isInstanceOf(TrainingValidationException.class)
                .hasMessageContaining("déjà inscrit");
    }

    @Test
    @DisplayName("Refus d'inscription si capacité maximale atteinte")
    void registerParticipantCapacityReachedThrows() {
        when(sessionRepository.findById(session.getId())).thenReturn(Optional.of(session));
        when(participantRepository.existsByTrainingIdAndUserId(session.getId(), user1.getId())).thenReturn(false);
        when(participantRepository.countByTrainingIdAndStatus(session.getId(), ParticipantStatus.REGISTERED)).thenReturn(5L);

        assertThatThrownBy(() -> service.registerParticipant(session.getId(), user1.getId()))
                .isInstanceOf(TrainingValidationException.class)
                .hasMessageContaining("capacité maximale");
    }

    @Test
    @DisplayName("Désinscription d'un participant")
    void unregisterParticipantSuccess() {
        when(participantRepository.existsByTrainingIdAndUserId(session.getId(), user1.getId())).thenReturn(true);

        service.unregisterParticipant(session.getId(), user1.getId());

        verify(participantRepository).deleteByTrainingIdAndUserId(session.getId(), user1.getId());
    }

    @Test
    @DisplayName("Calcul des KPIs de formation")
    void getKpisCalculation() {
        var s1 = TrainingSessionEntity.create("T1", "T1", null, null, null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.PLANNED, LocalDate.now(), LocalDate.now(), BigDecimal.valueOf(14.0), 10);
        var s2 = TrainingSessionEntity.create("T2", "T2", null, null, null, DeliveryMode.REMOTE, TrainingCategory.INTERNAL, TrainingStatus.COMPLETED, LocalDate.now(), LocalDate.now(), BigDecimal.valueOf(7.0), 10);

        when(sessionRepository.findAll()).thenReturn(List.of(s1, s2));
        when(participantRepository.count()).thenReturn(8L);

        var kpi = service.getKpis();

        assertThat(kpi.totalSessions()).isEqualTo(2);
        assertThat(kpi.plannedSessions()).isEqualTo(1);
        assertThat(kpi.completedSessions()).isEqualTo(1);
        assertThat(kpi.totalPlannedHours()).isEqualByComparingTo(BigDecimal.valueOf(21.0));
        assertThat(kpi.totalRegistrations()).isEqualTo(8);
    }
}
