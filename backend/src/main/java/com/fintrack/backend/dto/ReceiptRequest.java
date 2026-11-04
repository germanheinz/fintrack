package com.fintrack.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ReceiptRequest(
        @NotBlank(message = "Merchant is required") @Size(max = 500, message = "Merchant is too long") String merchant,
        @NotNull(message = "Date is required") LocalDate date,
        @NotNull(message = "Category is required") UUID categoryId,
        @NotNull(message = "Total is required") @Positive(message = "Total must be positive") BigDecimal total,
        @PositiveOrZero(message = "Tax must not be negative") BigDecimal taxAmount,
        @PositiveOrZero(message = "Discount must not be negative") BigDecimal discountAmount,
        @NotEmpty(message = "At least one item is required")
        @Size(max = 200, message = "Too many items") List<@Valid ReceiptItemRequest> items,
        // Optional id chosen by the client, so a later backup import finds the same transaction.
        UUID transactionId
) {
    public record ReceiptItemRequest(
            @NotBlank(message = "Item name is required") @Size(max = 255, message = "Item name is too long") String rawName,
            @Positive(message = "Quantity must be positive") BigDecimal quantity,
            @NotNull(message = "Item total is required") @PositiveOrZero(message = "Item total must not be negative") BigDecimal lineTotal,
            UUID itemCategoryId
    ) {
    }
}
