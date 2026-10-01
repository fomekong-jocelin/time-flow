package cm.indyli.timeflow.users.api;

import cm.indyli.timeflow.users.domain.UserAdministrationException;
import cm.indyli.timeflow.users.domain.UserNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = UserAdminController.class)
public class UserAdminExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    ProblemDetail notFound(UserNotFoundException exception) {
        return problem(HttpStatus.NOT_FOUND, "user_not_found", exception.getMessage());
    }

    @ExceptionHandler(UserAdministrationException.class)
    ProblemDetail refused(UserAdministrationException exception) {
        return problem(HttpStatus.UNPROCESSABLE_ENTITY, exception.getCode(), exception.getMessage());
    }

    private ProblemDetail problem(HttpStatus status, String code, String detail) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setProperty("code", code);
        return problem;
    }
}
