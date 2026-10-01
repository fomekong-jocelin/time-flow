package cm.indyli.timeflow.timesheet.domain;

import cm.indyli.timeflow.auth.domain.UserRole;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ValidationPolicyTest {

    private final UUID authorId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();
    private final UUID otherId = UUID.randomUUID();

    @Test
    void ensureCanReview_allowsSubmittedOnly() {
        assertThatCode(() -> ValidationPolicy.ensureCanReview(TimesheetStatus.SUBMITTED))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> ValidationPolicy.ensureCanReview(TimesheetStatus.DRAFT))
                .isInstanceOf(TimesheetStatusException.class);
        assertThatThrownBy(() -> ValidationPolicy.ensureCanReview(TimesheetStatus.VALIDATED))
                .isInstanceOf(TimesheetStatusException.class);
        assertThatThrownBy(() -> ValidationPolicy.ensureCanReview(TimesheetStatus.REJECTED))
                .isInstanceOf(TimesheetStatusException.class);
    }

    @Test
    void ensureNotSelfValidation_rejectsSelfReview() {
        assertThatCode(() -> ValidationPolicy.ensureNotSelfValidation(authorId, managerId))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> ValidationPolicy.ensureNotSelfValidation(authorId, authorId))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("sa propre feuille");
    }

    @Test
    void ensureValidRejectionComment_requiresAtLeastThreeChars() {
        assertThatCode(() -> ValidationPolicy.ensureValidRejectionComment("Heures incorrectes"))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> ValidationPolicy.ensureValidRejectionComment(null))
                .isInstanceOf(TimesheetValidationException.class);
        assertThatThrownBy(() -> ValidationPolicy.ensureValidRejectionComment("  "))
                .isInstanceOf(TimesheetValidationException.class);
        assertThatThrownBy(() -> ValidationPolicy.ensureValidRejectionComment("ab"))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("au moins 3 caractères");
    }

    @Test
    void ensureManagerScope_permitsAdminAndDirectionGlobally() {
        assertThatCode(() -> ValidationPolicy.ensureManagerScope(otherId, managerId, UserRole.ADMIN))
                .doesNotThrowAnyException();
        assertThatCode(() -> ValidationPolicy.ensureManagerScope(otherId, managerId, UserRole.DIRECTION))
                .doesNotThrowAnyException();
    }

    @Test
    void ensureManagerScope_verifiesDirectManagerForManagerRole() {
        assertThatCode(() -> ValidationPolicy.ensureManagerScope(managerId, managerId, UserRole.MANAGER))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> ValidationPolicy.ensureManagerScope(otherId, managerId, UserRole.MANAGER))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("pas le manager responsable");
    }

    @Test
    void ensureManagerScope_rejectsCollaborator() {
        assertThatThrownBy(() -> ValidationPolicy.ensureManagerScope(managerId, managerId, UserRole.COLLABORATOR))
                .isInstanceOf(TimesheetValidationException.class)
                .hasMessageContaining("pas autorisé");
    }
}
