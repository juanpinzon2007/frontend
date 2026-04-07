package com.jairo.store.order.service;

import com.jairo.store.order.client.ProductClient;
import com.jairo.store.order.domain.Order;
import com.jairo.store.order.repository.OrderRepository;
import com.jairo.store.shared.dto.OrderRequest;
import com.jairo.store.shared.dto.OrderResponse;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductClient productClient;
    private final R2dbcEntityTemplate entityTemplate;

    public OrderService(OrderRepository orderRepository, ProductClient productClient, R2dbcEntityTemplate entityTemplate) {
        this.orderRepository = orderRepository;
        this.productClient = productClient;
        this.entityTemplate = entityTemplate;
    }

    public Flux<OrderResponse> findAll() {
        return orderRepository.findAll().map(this::toResponse);
    }

    public Mono<OrderResponse> create(OrderRequest request) {
        String customerName = request.customerName() == null || request.customerName().isBlank()
                ? "Cliente general"
                : request.customerName().trim();

        return productClient.reserveStock(request.productId(), request.quantity())
                .map(product -> {
                    BigDecimal total = product.price().multiply(BigDecimal.valueOf(request.quantity()));
                    return new Order(
                            UUID.randomUUID(),
                            product.id(),
                            product.name(),
                            request.quantity(),
                            product.price(),
                            total,
                            customerName,
                            "CREATED",
                            OffsetDateTime.now()
                    );
                })
                .flatMap(order -> entityTemplate.insert(Order.class).using(order))
                .map(this::toResponse);
    }

    private OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getProductId(),
                order.getProductName(),
                order.getQuantity(),
                order.getUnitPrice(),
                order.getTotalPrice(),
                order.getCustomerName(),
                order.getStatus(),
                order.getCreatedAt()
        );
    }
}
