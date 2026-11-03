package com.fintrack.backend.dto;

import com.fintrack.backend.domain.Receipt;
import com.fintrack.backend.domain.ReceiptItem;
import com.fintrack.backend.domain.ReceiptStatus;
import com.fintrack.backend.domain.Transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ReceiptResponse(
        UUID id,
        UUID transactionId,
        ReceiptStatus status,
        String merchant,
        LocalDate date,
        UUID categoryId,
        BigDecimal total,
        BigDecimal taxAmount,
        BigDecimal discountAmount,
        List<ReceiptItemResponse> items
) {
    public record ReceiptItemResponse(
            UUID id,
            String rawName,
            BigDecimal quantity,
            BigDecimal lineTotal,
            UUID itemCategoryId
    ) {
        static ReceiptItemResponse from(ReceiptItem item) {
            return new ReceiptItemResponse(
                    item.getId(), item.getRawName(), item.getQuantity(), item.getLineTotal(), item.getItemCategoryId());
        }
    }

    public static ReceiptResponse from(Receipt receipt, Transaction transaction, List<ReceiptItem> items) {
        return new ReceiptResponse(
                receipt.getId(),
                transaction.getId(),
                receipt.getStatus(),
                transaction.getDescription(),
                transaction.getTransactionDate(),
                transaction.getCategoryId(),
                transaction.getAmount(),
                receipt.getTaxAmount(),
                receipt.getDiscountAmount(),
                items.stream().map(ReceiptItemResponse::from).toList()
        );
    }
}
