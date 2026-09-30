package cm.indyli.timeflow.auth.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    ProblemDetail badCredentials() {
        return problem(HttpStatus.UNAUTHORIZED, "authentication_failed", "Email ou mot de passe incorrect.");
    }

    @ExceptionHandler(LockedException.class)
    ProblemDetail locked() {
        return problem(HttpStatus.LOCKED, "account_locked", "Compte temporairement verrouillé après plusieurs tentatives.");
    }

    @ExceptionHandler(DisabledException.class)
    ProblemDetail disabled() {
        return problem(HttpStatus.FORBIDDEN, "account_disabled", "Ce compte est désactivé.");
    }

    @ExceptionHandler(IllegalStateException.class)
    ProblemDetail conflict(IllegalStateException exception) {
        return problem(HttpStatus.CONFLICT, "conflict", exception.getMessage());
    }

    private ProblemDetail problem(HttpStatus status, String code, String detail) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setProperty("code", code);
        return problem;
    }
}
