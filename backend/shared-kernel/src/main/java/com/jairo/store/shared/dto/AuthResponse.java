package com.jairo.store.shared.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String fullName,
        String email,
        String token,
        OffsetDateTime authenticatedAt
) {
}
