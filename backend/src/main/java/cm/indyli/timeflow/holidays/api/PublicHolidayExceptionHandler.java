package cm.indyli.timeflow.holidays.api;

import cm.indyli.timeflow.holidays.domain.HolidayValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice(basePackageClasses = PublicHolidayController.class)
public class PublicHolidayExceptionHandler {

    @ExceptionHandler(HolidayValidationException.class)
    public ProblemDetail handleValidation(HolidayValidationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setType(URI.create("urn:problem:holiday-validation"));
        problem.setTitle("Validation des jours fériés en échec");
        return problem;
    }
}
