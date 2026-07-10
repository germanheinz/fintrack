package com.fintrack.dto;

import java.util.UUID;

public record AuthResponse(
    String token,
    String type,
    UUID userId,
    String email,
    String name
) {
    public AuthResponse(String token, UUID userId, String email, String name) {
        this(token, "Bearer", userId, email, name);
    }
}
