package com.fintrack.backend.dto;

import com.fintrack.backend.domain.CategoryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionRequest(
        @NotNull(message = "Amount is required") @Positive(message = "Amount must be positive") BigDecimal amount,
        String description,
        @NotNull(message = "Date is required") LocalDate transactionDate,
        @NotNull(message = "Type is required") CategoryType type,
        @NotNull(message = "Category is required") UUID categoryId
) {
}
