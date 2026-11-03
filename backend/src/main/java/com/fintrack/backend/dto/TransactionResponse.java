package com.fintrack.backend.dto;

import com.fintrack.backend.domain.CategoryType;
import com.fintrack.backend.domain.Transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        BigDecimal amount,
        String description,
        LocalDate transactionDate,
        CategoryType type,
        UUID categoryId
) {
    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getAmount(),
                transaction.getDescription(),
                transaction.getTransactionDate(),
                transaction.getType(),
                transaction.getCategoryId()
        );
    }
}
