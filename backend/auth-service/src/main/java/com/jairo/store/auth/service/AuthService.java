package com.jairo.store.auth.service;

import com.jairo.store.auth.domain.AppUser;
import com.jairo.store.auth.repository.AppUserRepository;
import com.jairo.store.shared.dto.AuthResponse;
import com.jairo.store.shared.dto.LoginRequest;
import com.jairo.store.shared.dto.RegisterRequest;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final R2dbcEntityTemplate entityTemplate;

    public AuthService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, R2dbcEntityTemplate entityTemplate) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.entityTemplate = entityTemplate;
    }

    public Mono<AuthResponse> register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());

        return appUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .flatMap(existing -> Mono.<AuthResponse>error(
                        new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists")
                ))
                .switchIfEmpty(Mono.defer(() -> {
                    AppUser user = new AppUser(
                            UUID.randomUUID(),
                            request.fullName().trim(),
                            normalizedEmail,
                            passwordEncoder.encode(request.password()),
                            OffsetDateTime.now()
                    );

                    return entityTemplate.insert(AppUser.class)
                            .using(user)
                            .map(this::toAuthResponse);
                }));
    }

    public Mono<AuthResponse> login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());

        return appUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")))
                .flatMap(user -> {
                    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                        return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
                    }

                    return Mono.just(toAuthResponse(user));
                });
    }

    private AuthResponse toAuthResponse(AppUser user) {
        return new AuthResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                generateToken(user),
                OffsetDateTime.now()
        );
    }

    private String generateToken(AppUser user) {
        String rawToken = user.getId() + ":" + user.getEmail() + ":" + OffsetDateTime.now();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes(StandardCharsets.UTF_8));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
