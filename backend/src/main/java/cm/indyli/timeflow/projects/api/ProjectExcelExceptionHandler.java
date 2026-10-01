package cm.indyli.timeflow.projects.api;

import cm.indyli.timeflow.projects.application.InvalidProjectWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ProjectExcelExceptionHandler {
    @ExceptionHandler(InvalidProjectWorkbook.class)
    public ProblemDetail invalid(InvalidProjectWorkbook exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail tooLarge() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux (1 Mo maximum).");
    }
}
