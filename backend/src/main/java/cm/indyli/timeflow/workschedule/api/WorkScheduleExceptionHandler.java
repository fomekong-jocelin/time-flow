package cm.indyli.timeflow.workschedule.api;

import cm.indyli.timeflow.workschedule.domain.WorkScheduleValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {WorkScheduleAdminController.class, WorkScheduleUserController.class})
public class WorkScheduleExceptionHandler {

    @ExceptionHandler(WorkScheduleValidationException.class)
    public ProblemDetail handleValidation(WorkScheduleValidationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Règle de gestion profil de travail non respectée");
        return problem;
    }
}
