package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.auth.application.CurrentUserService;
import cm.indyli.timeflow.auth.application.EntraOidcUserService;
import cm.indyli.timeflow.auth.config.AuthProperties;
import cm.indyli.timeflow.auth.domain.AuthProvider;
import cm.indyli.timeflow.auth.domain.UserRole;
import cm.indyli.timeflow.auth.persistence.AppUserRepository;
import cm.indyli.timeflow.auth.security.TimeFlowPrincipal;
import cm.indyli.timeflow.config.SecurityConfig;
import cm.indyli.timeflow.training.application.TrainingService;
import cm.indyli.timeflow.training.domain.*;
import cm.indyli.timeflow.training.persistence.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MVC with the real use case, not a mocked TrainingService. */
@WebMvcTest(TrainingController.class)
@Import({SecurityConfig.class, TrainingService.class, TrainingExceptionHandler.class})
class TrainingObjectSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean TrainingSessionRepository sessions;
    @MockitoBean TrainingParticipantRepository participants;
    @MockitoBean AppUserRepository users;
    @MockitoBean CurrentUserService currentUser;
    @MockitoBean EntraOidcUserService oidc;
    @MockitoBean AuthProperties properties;
    @MockitoBean ClientRegistrationRepository registrations;
    final UUID trainerId = UUID.randomUUID(), learnerId = UUID.randomUUID();
    TrainingSessionEntity session;
    TrainingParticipantEntity participant;
    @BeforeEach void setup() {
        session = TrainingSessionEntity.create("SEC-1", "Training", null, trainerId, null, DeliveryMode.REMOTE,
                TrainingCategory.INTERNAL, TrainingStatus.IN_PROGRESS, LocalDate.of(2050, 5, 6), LocalDate.of(2050, 5, 6), BigDecimal.ONE, 10);
        participant = TrainingParticipantEntity.create(session.getId(), learnerId, ParticipantStatus.REGISTERED);
        when(sessions.lockById(session.getId())).thenReturn(Optional.of(session));
        when(participants.findByTrainingIdAndUserId(session.getId(), learnerId)).thenReturn(Optional.of(participant));
    }
    void actor(UUID id, UserRole role) {
        when(currentUser.resolve(any())).thenReturn(new TimeFlowPrincipal(id, "actor@example.test", "Actor", role, AuthProvider.LOCAL));
    }
    String attendance() { return "/api/v1/trainings/" + session.getId() + "/participants/" + learnerId + "/status"; }
    @Test void foreignTrainerGets403AndNoMutation() throws Exception {
        actor(UUID.randomUUID(), UserRole.TRAINER);
        mvc.perform(patch(attendance()).with(user("trainer").roles("TRAINER")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ATTENDED\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("training.errors.forbidden"));
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.REGISTERED); verify(participants, never()).save(any());
    }
    @Test void assignedTrainerCanRecordAttendance() throws Exception {
        actor(trainerId, UserRole.TRAINER);
        mvc.perform(patch(attendance()).with(user("trainer").roles("TRAINER")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ATTENDED\"}"))
                .andExpect(status().isOk());
        assertThat(participant.getStatus()).isEqualTo(ParticipantStatus.ATTENDED);
        assertThat(participant.getEvents().getLast().getActorId()).isEqualTo(trainerId);
    }
    @Test void collaboratorCannotUseAttendanceEndpointEvenWhenAssigned() throws Exception {
        actor(trainerId, UserRole.COLLABORATOR);
        mvc.perform(patch(attendance()).with(user("collab").roles("COLLABORATOR")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ATTENDED\"}"))
                .andExpect(status().isForbidden()); verify(participants, never()).save(any());
    }
    @Test void attendanceStillRequiresCsrf() throws Exception {
        actor(trainerId, UserRole.TRAINER);
        mvc.perform(patch(attendance()).with(user("trainer").roles("TRAINER"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"ATTENDED\"}"))
                .andExpect(status().isForbidden()); verify(participants, never()).save(any());
    }
    @Test void missingStatusIs400InsteadOfDatabaseFailure() throws Exception {
        actor(trainerId, UserRole.TRAINER);
        mvc.perform(patch(attendance()).with(user("trainer").roles("TRAINER")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("training.errors.invalid"));
        verify(participants, never()).save(any());
    }
    @Test void browserTimedPayloadSurvivesTheRealApiMapperAndService() throws Exception {
        actor(trainerId, UserRole.ADMIN);
        mvc.perform(post("/api/v1/trainings").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"reference":"API-TIME","title":"Timed","deliveryMode":"REMOTE","category":"INTERNAL",
                 "status":"PLANNED","startDate":"2050-05-06","endDate":"2050-05-06","durationHours":2,"maxParticipants":10,
                 "startsAt":"2050-05-06T08:00:00Z","endsAt":"2050-05-06T10:00:00Z","timeZone":"Africa/Douala"}
                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.startDate").value("2050-05-06"))
                .andExpect(jsonPath("$.startsAt").value("2050-05-06T08:00:00Z"))
                .andExpect(jsonPath("$.timeZone").value("Africa/Douala"));
    }
    @Test void invalidCalendarContractAndCapacityAreRejected() throws Exception {
        actor(trainerId, UserRole.ADMIN);
        mvc.perform(post("/api/v1/trainings").with(user("admin").roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                {"reference":"API-TIME","title":"Timed","deliveryMode":"REMOTE","category":"INTERNAL",
                 "status":"PLANNED","startDate":"2050-05-06T08:00:00Z","endDate":"2050-05-06T10:00:00Z",
                 "durationHours":2,"maxParticipants":501}
                """))
                .andExpect(status().isBadRequest()); verify(sessions, never()).save(any());
    }
}
