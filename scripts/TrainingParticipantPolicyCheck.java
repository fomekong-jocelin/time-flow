import cm.indyli.timeflow.training.domain.*;
import java.util.UUID;

/** Dependency-free checks of the actual production policy, not Spring or PostgreSQL tests. */
public class TrainingParticipantPolicyCheck {
    static int assertions;
    static void check(boolean value) { assertions++; if (!value) throw new AssertionError("Assertion " + assertions); }
    static void denied(String code, Runnable action) {
        assertions++;
        try { action.run(); throw new AssertionError("Expected " + code); }
        catch (TrainingValidationException error) {
            if (!error.getCode().equals("training.errors." + code)) throw new AssertionError(error.getCode());
        }
    }
    public static void main(String[] args) {
        UUID trainer = UUID.randomUUID();
        denied("trainerParticipantConflict", () -> TrainingParticipantPolicy.requireNotTrainer(trainer, trainer));
        TrainingParticipantPolicy.requireNotTrainer(trainer, UUID.randomUUID()); check(true);
        TrainingParticipantPolicy.requireNotTrainer(null, trainer); check(true);
        check(!TrainingParticipantPolicy.trainerWithdrawalRequired(null, false));
        check(!TrainingParticipantPolicy.trainerWithdrawalRequired(ParticipantStatus.CANCELLED, false));
        check(TrainingParticipantPolicy.trainerWithdrawalRequired(ParticipantStatus.REGISTERED, true));
        denied("trainerWithdrawalRequired", () -> TrainingParticipantPolicy.trainerWithdrawalRequired(ParticipantStatus.REGISTERED, false));
        for (boolean consent : new boolean[]{false, true}) {
            denied("trainerAttendanceConflict", () -> TrainingParticipantPolicy.trainerWithdrawalRequired(ParticipantStatus.ATTENDED, consent));
        }
        for (var session : TrainingStatus.values()) {
            String reason = TrainingParticipantPolicy.validateCorrection(session, ParticipantStatus.ATTENDED,
                    ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED, "  Wrong attendance  ");
            check(reason.equals("Wrong attendance"));
        }
        for (var session : new TrainingStatus[]{TrainingStatus.PLANNED, TrainingStatus.IN_PROGRESS}) {
            check(TrainingParticipantPolicy.validateCorrection(session, ParticipantStatus.ATTENDED,
                    ParticipantStatus.ATTENDED, ParticipantStatus.REGISTERED, "Wrong attendance").equals("Wrong attendance"));
        }
        for (var session : new TrainingStatus[]{TrainingStatus.COMPLETED, TrainingStatus.CANCELLED}) {
            denied("closedReactivation", () -> TrainingParticipantPolicy.validateCorrection(session,
                    ParticipantStatus.ATTENDED, ParticipantStatus.ATTENDED, ParticipantStatus.REGISTERED, "Wrong attendance"));
        }
        for (String reason : new String[]{null, "", "    ", "four", "x".repeat(501)}) {
            denied("correctionReasonRequired", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                    ParticipantStatus.ATTENDED, ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED, reason));
        }
        for (String reason : new String[]{"abcde", "x".repeat(500)}) {
            check(TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED, ParticipantStatus.ATTENDED,
                    ParticipantStatus.ATTENDED, ParticipantStatus.CANCELLED, reason).equals(reason));
        }
        denied("conflict", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                ParticipantStatus.ATTENDED, ParticipantStatus.REGISTERED, ParticipantStatus.CANCELLED, "Reason given"));
        denied("noStatusChange", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                ParticipantStatus.REGISTERED, ParticipantStatus.REGISTERED, ParticipantStatus.REGISTERED, "Reason given"));
        denied("invalid", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                ParticipantStatus.REGISTERED, ParticipantStatus.REGISTERED, ParticipantStatus.ATTENDED, "Reason given"));
        denied("invalid", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                ParticipantStatus.ATTENDED, null, ParticipantStatus.CANCELLED, "Reason given"));
        denied("invalid", () -> TrainingParticipantPolicy.validateCorrection(TrainingStatus.PLANNED,
                ParticipantStatus.ATTENDED, ParticipantStatus.ATTENDED, null, "Reason given"));
        System.out.println(assertions + " production-policy assertions passed");
    }
}
