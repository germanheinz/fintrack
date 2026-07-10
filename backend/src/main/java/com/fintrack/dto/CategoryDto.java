package com.fintrack.dto;

import com.fintrack.entity.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDateTime;
import java.util.UUID;

public record CategoryDto(
    UUID id,
    @NotBlank String name,
    @NotBlank String icon,
    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color,
    @NotNull TransactionType type,
    boolean isDefault,
    LocalDateTime createdAt
) {}
