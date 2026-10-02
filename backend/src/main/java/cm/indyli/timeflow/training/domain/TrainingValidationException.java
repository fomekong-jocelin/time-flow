package cm.indyli.timeflow.training.domain;

public class TrainingValidationException extends RuntimeException {
    private final String code;

    public TrainingValidationException(String message) {
        this("training.errors.invalid", message);
    }

    public TrainingValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
}
