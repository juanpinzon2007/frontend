package com.jairo.store.shared.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record OrderRequest(
        @NotNull(message = "Product id is required") UUID productId,
        @NotNull(message = "Quantity is required")
        @Positive(message = "Quantity must be greater than zero")
        Integer quantity,
        String customerName
) {
}
