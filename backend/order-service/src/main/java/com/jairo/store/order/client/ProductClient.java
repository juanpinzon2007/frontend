package com.jairo.store.order.client;

import com.jairo.store.shared.dto.ProductResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Component
public class ProductClient {

    private final WebClient webClient;

    public ProductClient(WebClient.Builder builder,
                         @Value("${clients.product-service.base-url:http://localhost:8081}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    public Mono<ProductResponse> getProduct(UUID productId) {
        return webClient.get()
                .uri("/api/products/{id}", productId)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError,
                        response -> Mono.error(new ResponseStatusException(NOT_FOUND, "Product not found")))
                .bodyToMono(ProductResponse.class);
    }
}
