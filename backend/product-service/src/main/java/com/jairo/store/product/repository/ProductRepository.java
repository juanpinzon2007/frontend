package com.jairo.store.product.repository;

import com.jairo.store.product.domain.Product;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

import java.util.UUID;

public interface ProductRepository extends ReactiveCrudRepository<Product, UUID> {
}
