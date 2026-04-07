package com.jairo.store.auth.controller;

import com.jairo.store.auth.config.GlobalExceptionHandler;
import com.jairo.store.auth.service.AuthService;
import com.jairo.store.shared.dto.AuthResponse;
import com.jairo.store.shared.dto.LoginRequest;
import com.jairo.store.shared.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(controllers = AuthController.class)
@Import(GlobalExceptionHandler.class)
class AuthControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private AuthService authService;

    @Test
    void shouldRegisterUser() {
        RegisterRequest request = new RegisterRequest("Jairo Store", "jairo@example.com", "Clave123");
        AuthResponse response = new AuthResponse(
                UUID.randomUUID(),
                request.fullName(),
                request.email(),
                "token-demo",
                OffsetDateTime.now()
        );
        when(authService.register(any(RegisterRequest.class))).thenReturn(Mono.just(response));

        webTestClient.post()
                .uri("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.email").isEqualTo("jairo@example.com");
    }

    @Test
    void shouldLoginUser() {
        LoginRequest request = new LoginRequest("jairo@example.com", "Clave123");
        AuthResponse response = new AuthResponse(
                UUID.randomUUID(),
                "Jairo Store",
                request.email(),
                "token-demo",
                OffsetDateTime.now()
        );
        when(authService.login(any(LoginRequest.class))).thenReturn(Mono.just(response));

        webTestClient.post()
                .uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.token").isEqualTo("token-demo");
    }
}
