package cm.indyli.timeflow.users.application;

import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserEntity;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.persistence.AuthIdentityRepository;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileEntity;
import cm.indyli.timeflow.workschedule.persistence.WorkScheduleProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class UserDirectoryServiceTest {

    private AppUserRepository userRepository;
    private AuthIdentityRepository identityRepository;
    private WorkScheduleProfileRepository workScheduleRepository;
    private UserDirectoryService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        identityRepository = mock(AuthIdentityRepository.class);
        workScheduleRepository = mock(WorkScheduleProfileRepository.class);
        service = new UserDirectoryService(userRepository, identityRepository, workScheduleRepository);
    }

    @Test
    @DisplayName("Devrait mapper le nom du profil de temps de travail lors du listing")
    void shouldMapProfileNameOnList() {
        var profile = WorkScheduleProfileEntity.create(
                "CADRE_38H30", "Forfait Cadre 38h30", "Desc",
                2310, 462, 720, 2880, "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY", false, false
        );

        var user = AppUserEntity.local("dev@example.com", "Dev User", UserRole.COLLABORATOR);
        user.setWorkScheduleProfileId(profile.getId());

        when(userRepository.findAllByOrderByDisplayNameAsc()).thenReturn(List.of(user));
        when(identityRepository.findByUser_IdIn(any())).thenReturn(List.of());
        when(workScheduleRepository.findAll()).thenReturn(List.of(profile));

        var result = service.list();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().workScheduleProfileId()).isEqualTo(profile.getId());
        assertThat(result.getFirst().workScheduleProfileName()).isEqualTo("Forfait Cadre 38h30");
    }

    @Test
    @DisplayName("Devrait mapper le nom du profil de temps de travail lors d'un get par ID")
    void shouldMapProfileNameOnGet() {
        var profile = WorkScheduleProfileEntity.create(
                "CADRE_38H30", "Forfait Cadre 38h30", "Desc",
                2310, 462, 720, 2880, "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY", false, false
        );

        var user = AppUserEntity.local("dev@example.com", "Dev User", UserRole.COLLABORATOR);
        user.setWorkScheduleProfileId(profile.getId());

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(identityRepository.findByUser_IdIn(any())).thenReturn(List.of());
        when(workScheduleRepository.findAll()).thenReturn(List.of(profile));

        var result = service.get(user.getId());

        assertThat(result.workScheduleProfileId()).isEqualTo(profile.getId());
        assertThat(result.workScheduleProfileName()).isEqualTo("Forfait Cadre 38h30");
    }
}
