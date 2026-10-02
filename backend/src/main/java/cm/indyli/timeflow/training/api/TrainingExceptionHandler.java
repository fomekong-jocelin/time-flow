package cm.indyli.timeflow.training.api;

import cm.indyli.timeflow.training.domain.TrainingValidationException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.Set;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackageClasses = TrainingController.class)
public class TrainingExceptionHandler {
    @ExceptionHandler(TrainingValidationException.class)
    public ProblemDetail handleValidation(TrainingValidationException ex) {
        HttpStatus status = ex.getCode().endsWith("notFound") ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        if (Set.of("training.errors.full", "training.errors.closed", "training.errors.historyProtected",
                "training.errors.duplicateReference", "training.errors.capacityBelowOccupancy").contains(ex.getCode())) {
            status = HttpStatus.CONFLICT;
        }
        return problem(status, ex.getCode(), ex.getMessage());
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail forbidden(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "training.errors.forbidden", "Action non autorisée.");
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class, ConstraintViolationException.class})
    public ProblemDetail invalid(Exception ex) {
        return problem(HttpStatus.BAD_REQUEST, "training.errors.invalid", "Vérifiez les champs saisis.");
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflict(DataIntegrityViolationException ex) {
        return problem(HttpStatus.CONFLICT, "training.errors.conflict", "Les données ont changé. Actualisez puis réessayez.");
    }
    private ProblemDetail problem(HttpStatus status, String code, String detail) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("urn:problem:training"));
        problem.setTitle("Training request failed");
        problem.setProperty("code", code);
        return problem;
    }
}
