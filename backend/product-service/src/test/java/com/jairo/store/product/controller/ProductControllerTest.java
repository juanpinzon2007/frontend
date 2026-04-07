package com.jairo.store.product.controller;

import com.jairo.store.product.config.GlobalExceptionHandler;
import com.jairo.store.product.service.ProductService;
import com.jairo.store.shared.dto.ProductRequest;
import com.jairo.store.shared.dto.ProductResponse;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(controllers = ProductController.class)
@Import(GlobalExceptionHandler.class)
class ProductControllerTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ProductService productService;

    @Test
    void shouldReturnProducts() {
        ProductResponse response = new ProductResponse(UUID.randomUUID(), "Laptop Pro 14", "Laptop ligera", BigDecimal.valueOf(1299), 12);
        when(productService.findAll()).thenReturn(Flux.just(response));

        webTestClient.get()
                .uri("/api/products")
                .exchange()
                .expectStatus().isOk()
                .expectBodyList(ProductResponse.class)
                .hasSize(1);
    }

    @Test
    void shouldCreateProduct() {
        ProductRequest request = new ProductRequest("Teclado", "Teclado mecanico", BigDecimal.valueOf(80), 20);
        ProductResponse response = new ProductResponse(UUID.randomUUID(), request.name(), request.description(), request.price(), request.availableStock());
        when(productService.create(any(ProductRequest.class))).thenReturn(Mono.just(response));

        webTestClient.post()
                .uri("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.name").isEqualTo("Teclado");
    }
}
