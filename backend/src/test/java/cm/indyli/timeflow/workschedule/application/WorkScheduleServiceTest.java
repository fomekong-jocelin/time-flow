package cm.indyli.timeflow.workschedule.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.workschedule.domain.WorkScheduleValidationException;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class WorkScheduleServiceTest {

    private WorkScheduleProfileRepository profileRepository;
    private AppUserRepository userRepository;
    private WorkScheduleService service;

    private WorkScheduleProfileEntity defaultProfile;

    @BeforeEach
    void setUp() {
        profileRepository = mock(WorkScheduleProfileRepository.class);
        userRepository = mock(AppUserRepository.class);
        service = new WorkScheduleService(profileRepository, userRepository);

        defaultProfile = WorkScheduleProfileEntity.create(
                "STANDARD_35H", "Standard 35h", "Standard",
                2100, 420, 600, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
                false, true
        );

        when(profileRepository.findByIsDefaultTrue()).thenReturn(Optional.of(defaultProfile));
        when(profileRepository.save(any(WorkScheduleProfileEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("getForUser retourne le profil assigné de l'utilisateur")
    void getForUserReturnsAssignedProfile() {
        var user = AppUserEntity.local("john@example.com", "John Doe", UserRole.COLLABORATOR);
        var customProfile = WorkScheduleProfileEntity.create(
                "CUSTOM_32H", "Temps partiel", "Desc",
                1920, 480, 600, 2400,
                "MONDAY,TUESDAY,THURSDAY,FRIDAY",
                false, false
        );
        user.setWorkScheduleProfileId(customProfile.getId());

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(profileRepository.findById(customProfile.getId())).thenReturn(Optional.of(customProfile));

        var summary = service.getForUser(user.getId());

        assertThat(summary.code()).isEqualTo("CUSTOM_32H");
        assertThat(summary.workingDays()).containsExactly("MONDAY", "TUESDAY", "THURSDAY", "FRIDAY");
    }

    @Test
    @DisplayName("getForUser se rabat sur le profil par défaut si l'utilisateur n'en a pas")
    void getForUserFallsBackToDefaultProfile() {
        var user = AppUserEntity.local("jane@example.com", "Jane Doe", UserRole.COLLABORATOR);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        var summary = service.getForUser(user.getId());

        assertThat(summary.code()).isEqualTo("STANDARD_35H");
        assertThat(summary.isDefault()).isTrue();
    }

    @Test
    @DisplayName("create rejette un code déjà existant")
    void createRejectsDuplicateCode() {
        when(profileRepository.findByCodeIgnoreCase("STANDARD_35H")).thenReturn(Optional.of(defaultProfile));

        var cmd = new CreateWorkScheduleCommand(
                "STANDARD_35H", "Autre standard", null,
                2100, 420, 600, 2880,
                List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"),
                false, false
        );

        assertThatThrownBy(() -> service.create(cmd))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("existe déjà");
    }

    @Test
    @DisplayName("create réinitialise les autres profils par défaut si isDefault est vrai")
    void createResetsOtherDefaultsWhenDefault() {
        var cmd = new CreateWorkScheduleCommand(
                "NEW_DEFAULT", "Nouveau standard", null,
                2100, 420, 600, 2880,
                List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"),
                false, true
        );

        var summary = service.create(cmd);

        assertThat(summary.code()).isEqualTo("NEW_DEFAULT");
        assertThat(summary.isDefault()).isTrue();
        verify(profileRepository).resetOtherDefaults(any());
    }

    @Test
    @DisplayName("setDefault active le profil et réinitialise les autres profils par défaut")
    void setDefaultUpdatesProfile() {
        var profile = WorkScheduleProfileEntity.create(
                "CADRE", "Cadre 38h30", null,
                2310, 462, 720, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
                false, false
        );
        when(profileRepository.findById(profile.getId())).thenReturn(Optional.of(profile));

        var summary = service.setDefault(profile.getId());

        assertThat(summary.isDefault()).isTrue();
        verify(profileRepository).resetOtherDefaults(profile.getId());
    }

    @Test
    @DisplayName("setDefault échoue si le profil est inactif")
    void setDefaultFailsIfInactive() {
        var profile = WorkScheduleProfileEntity.create(
                "CADRE", "Cadre 38h30", null,
                2310, 462, 720, 2880,
                "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY",
                false, false
        );
        profile.setActive(false);
        when(profileRepository.findById(profile.getId())).thenReturn(Optional.of(profile));

        assertThatThrownBy(() -> service.setDefault(profile.getId()))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("inactif comme profil par défaut");
    }

    @Test
    @DisplayName("toggleActive interdit de désactiver le profil par défaut")
    void toggleActiveProhibitsDeactivatingDefault() {
        when(profileRepository.findById(defaultProfile.getId())).thenReturn(Optional.of(defaultProfile));

        assertThatThrownBy(() -> service.toggleActive(defaultProfile.getId()))
                .isInstanceOf(WorkScheduleValidationException.class)
                .hasMessageContaining("profil de travail par défaut");
    }
}
