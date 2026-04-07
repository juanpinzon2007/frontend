package com.jairo.store.order.config;

import com.jairo.store.shared.dto.ApiError;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        ApiError error = new ApiError(
                OffsetDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                exception.getReason() == null ? status.getReasonPhrase() : exception.getReason(),
                List.of()
        );
        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler({WebExchangeBindException.class, ConstraintViolationException.class})
    public ResponseEntity<ApiError> handleValidation(Exception exception) {
        List<String> details;
        if (exception instanceof WebExchangeBindException bindException) {
            details = bindException.getFieldErrors().stream()
                    .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                    .toList();
        } else if (exception instanceof ConstraintViolationException constraintViolationException) {
            details = constraintViolationException.getConstraintViolations().stream()
                    .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                    .toList();
        } else {
            details = List.of();
        }

        ApiError error = new ApiError(
                OffsetDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Validation failed",
                details
        );
        return ResponseEntity.badRequest().body(error);
    }
}
