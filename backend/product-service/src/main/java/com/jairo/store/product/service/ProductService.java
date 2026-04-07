package com.jairo.store.product.service;

import com.jairo.store.product.domain.Product;
import com.jairo.store.product.repository.ProductRepository;
import com.jairo.store.shared.dto.ProductRequest;
import com.jairo.store.shared.dto.ProductResponse;
import org.springframework.http.HttpStatus;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final R2dbcEntityTemplate entityTemplate;

    public ProductService(ProductRepository productRepository, R2dbcEntityTemplate entityTemplate) {
        this.productRepository = productRepository;
        this.entityTemplate = entityTemplate;
    }

    public Flux<ProductResponse> findAll() {
        return productRepository.findAll().map(this::toResponse);
    }

    public Mono<ProductResponse> findById(UUID id) {
        return productRepository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found")))
                .map(this::toResponse);
    }

    public Mono<ProductResponse> create(ProductRequest request) {
        Product product = new Product(UUID.randomUUID(), request.name(), request.description(), request.price(), request.availableStock());
        return entityTemplate.insert(Product.class)
                .using(product)
                .map(this::toResponse);
    }

    public Mono<ProductResponse> update(UUID id, ProductRequest request) {
        return productRepository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found")))
                .flatMap(existing -> {
                    existing.setName(request.name());
                    existing.setDescription(request.description());
                    existing.setPrice(request.price());
                    existing.setAvailableStock(request.availableStock());
                    return productRepository.save(existing);
                })
                .map(this::toResponse);
    }

    public Mono<Void> delete(UUID id) {
        return productRepository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found")))
                .flatMap(productRepository::delete);
    }

    public Mono<ProductResponse> reserveStock(UUID id, Integer quantity) {
        return productRepository.findById(id)
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found")))
                .flatMap(product -> {
                    if (product.getAvailableStock() < quantity) {
                        return Mono.error(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock available"));
                    }

                    product.setAvailableStock(product.getAvailableStock() - quantity);
                    return productRepository.save(product);
                })
                .map(this::toResponse);
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getAvailableStock()
        );
    }
}
