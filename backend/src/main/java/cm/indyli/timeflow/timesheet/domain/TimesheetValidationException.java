package cm.indyli.timeflow.timesheet.domain;

public class TimesheetValidationException extends RuntimeException {
    public TimesheetValidationException(String message) {
        super(message);
    }
}
