package com.jairo.store.order.controller;

import com.jairo.store.order.config.GlobalExceptionHandler;
import com.jairo.store.order.service.OrderService;
import com.jairo.store.shared.dto.OrderRequest;
import com.jairo.store.shared.dto.OrderResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(controllers = OrderController.class)
@Import(GlobalExceptionHandler.class)
class OrderControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrders() {
        OrderResponse response = new OrderResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Laptop Pro 14",
                1,
                BigDecimal.valueOf(1299),
                BigDecimal.valueOf(1299),
                "Jairo",
                "CREATED",
                OffsetDateTime.now()
        );

        when(orderService.findAll()).thenReturn(Flux.just(response));

        webTestClient.get()
                .uri("/api/orders")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(OrderResponse.class)
                .hasSize(1);
    }

    @Test
    void shouldCreateOrder() {
        OrderRequest request = new OrderRequest(UUID.randomUUID(), 2, "Jairo");
        OrderResponse response = new OrderResponse(
                UUID.randomUUID(),
                request.productId(),
                "Monitor 27 4K",
                request.quantity(),
                BigDecimal.valueOf(420),
                BigDecimal.valueOf(840),
                request.customerName(),
                "CREATED",
                OffsetDateTime.now()
        );

        when(orderService.create(any(OrderRequest.class))).thenReturn(Mono.just(response));

        webTestClient.post()
                .uri("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.totalPrice").isEqualTo(840);
    }
}
