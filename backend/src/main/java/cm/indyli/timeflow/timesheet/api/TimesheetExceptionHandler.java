package cm.indyli.timeflow.timesheet.api;

import cm.indyli.timeflow.timesheet.domain.TimesheetStatusException;
import cm.indyli.timeflow.timesheet.domain.TimesheetValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {TimesheetController.class, TimesheetManagerController.class})
public class TimesheetExceptionHandler {

    @ExceptionHandler(TimesheetValidationException.class)
    public ProblemDetail handleValidation(TimesheetValidationException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(TimesheetStatusException.class)
    public ProblemDetail handleStatus(TimesheetStatusException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    }
}
