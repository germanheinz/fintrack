package com.fintrack.dto;

import com.fintrack.entity.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionDto(
    UUID id,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    String description,
    @NotNull LocalDate date,
    @NotNull TransactionType type,
    @NotNull UUID categoryId,
    String categoryName,
    String categoryIcon,
    String categoryColor,
    LocalDateTime createdAt
) {}
