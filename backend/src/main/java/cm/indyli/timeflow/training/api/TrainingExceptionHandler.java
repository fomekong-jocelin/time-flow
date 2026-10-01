package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.training.domain.TrainingValidationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice(basePackageClasses = TrainingController.class)
public class TrainingExceptionHandler {

    @ExceptionHandler(TrainingValidationException.class)
    public ProblemDetail handleValidation(TrainingValidationException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setType(URI.create("urn:problem:training-validation"));
        problem.setTitle("Validation de session de formation");
        return problem;
    }
}
