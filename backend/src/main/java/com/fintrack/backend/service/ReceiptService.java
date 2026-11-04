package com.fintrack.backend.service;

import com.fintrack.backend.domain.CategoryType;
import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.domain.Receipt;
import com.fintrack.backend.domain.ReceiptItem;
import com.fintrack.backend.domain.ReceiptStatus;
import com.fintrack.backend.domain.Transaction;
import com.fintrack.backend.dto.ReceiptRequest;
import com.fintrack.backend.dto.ReceiptRequest.ReceiptItemRequest;
import com.fintrack.backend.dto.ReceiptResponse;
import com.fintrack.backend.exception.BadRequestException;
import com.fintrack.backend.exception.ResourceNotFoundException;
import com.fintrack.backend.repository.CategoryRepository;
import com.fintrack.backend.repository.ItemCategoryRepository;
import com.fintrack.backend.repository.OutboxEventRepository;
import com.fintrack.backend.repository.ReceiptItemRepository;
import com.fintrack.backend.repository.ReceiptRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ReceiptService {

    static final String AGGREGATE_TYPE = "RECEIPT";
    static final String EVENT_RECEIPT_SUBMITTED = "RECEIPT_SUBMITTED";

    // Allows small rounding differences between the printed total and the sum of lines.
    private static final BigDecimal TOTAL_TOLERANCE = new BigDecimal("0.02");

    public record CreatedReceipt(ReceiptResponse receipt, boolean created) {
    }

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final ItemCategoryRepository itemCategoryRepository;
    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final OutboxEventRepository outboxEventRepository;

    public ReceiptService(
            TransactionRepository transactionRepository,
            CategoryRepository categoryRepository,
            ItemCategoryRepository itemCategoryRepository,
            ReceiptRepository receiptRepository,
            ReceiptItemRepository receiptItemRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.itemCategoryRepository = itemCategoryRepository;
        this.receiptRepository = receiptRepository;
        this.receiptItemRepository = receiptItemRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    /** Saves transaction, receipt, items and outbox event in one database transaction. */
    @Transactional
    public CreatedReceipt create(UUID userId, String idempotencyKey, ReceiptRequest request) {
        Optional<Receipt> existing = receiptRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
        if (existing.isPresent()) {
            return new CreatedReceipt(toResponse(existing.get(), userId), false);
        }

        if (!categoryRepository.existsByIdAndUserId(request.categoryId(), userId)) {
            throw new ResourceNotFoundException("Category not found: " + request.categoryId());
        }
        validateItemCategories(userId, request.items());

        BigDecimal tax = orZero(request.taxAmount());
        BigDecimal discount = orZero(request.discountAmount());
        validateTotals(request, tax, discount);

        // save() with a preset id would update an existing row, even one of another user.
        if (request.transactionId() != null && transactionRepository.existsById(request.transactionId())) {
            throw new BadRequestException("Transaction id is already in use: " + request.transactionId());
        }

        Transaction transaction = transactionRepository.save(Transaction.builder()
                .id(request.transactionId())
                .userId(userId)
                .categoryId(request.categoryId())
                .amount(request.total())
                .description(request.merchant())
                .transactionDate(request.date())
                .type(CategoryType.EXPENSE)
                .build());

        Receipt receipt = receiptRepository.save(Receipt.builder()
                .userId(userId)
                .transactionId(transaction.getId())
                .status(ReceiptStatus.SUBMITTED)
                .idempotencyKey(idempotencyKey)
                .taxAmount(tax)
                .discountAmount(discount)
                .build());

        List<ReceiptItem> items = new ArrayList<>();
        for (int i = 0; i < request.items().size(); i++) {
            ReceiptItemRequest item = request.items().get(i);
            items.add(ReceiptItem.builder()
                    .userId(userId)
                    .receiptId(receipt.getId())
                    .position(i)
                    .rawName(item.rawName())
                    .quantity(item.quantity())
                    .lineTotal(item.lineTotal())
                    .itemCategoryId(item.itemCategoryId())
                    .build());
        }
        List<ReceiptItem> savedItems = receiptItemRepository.saveAll(items);

        outboxEventRepository.save(OutboxEvent.builder()
                .userId(userId)
                .aggregateType(AGGREGATE_TYPE)
                .aggregateId(receipt.getId())
                .eventType(EVENT_RECEIPT_SUBMITTED)
                .build());

        return new CreatedReceipt(ReceiptResponse.from(receipt, transaction, savedItems), true);
    }

    @Transactional(readOnly = true)
    public ReceiptResponse get(UUID userId, UUID receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .filter(found -> found.getUserId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Receipt not found: " + receiptId));
        return toResponse(receipt, userId);
    }

    private ReceiptResponse toResponse(Receipt receipt, UUID userId) {
        Transaction transaction = transactionRepository.findById(receipt.getTransactionId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + receipt.getTransactionId()));
        List<ReceiptItem> items =
                receiptItemRepository.findByReceiptIdAndUserIdOrderByPositionAsc(receipt.getId(), userId);
        return ReceiptResponse.from(receipt, transaction, items);
    }

    // An item category from another user would break user isolation.
    private void validateItemCategories(UUID userId, List<ReceiptItemRequest> items) {
        Set<UUID> ids = items.stream()
                .map(ReceiptItemRequest::itemCategoryId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        if (!ids.isEmpty() && itemCategoryRepository.countByUserIdAndIdIn(userId, ids) != ids.size()) {
            throw new ResourceNotFoundException("Item category not found");
        }
    }

    private void validateTotals(ReceiptRequest request, BigDecimal tax, BigDecimal discount) {
        BigDecimal itemsSum = request.items().stream()
                .map(ReceiptItemRequest::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expected = itemsSum.add(tax).subtract(discount);
        if (expected.subtract(request.total()).abs().compareTo(TOTAL_TOLERANCE) > 0) {
            throw new BadRequestException(
                    "Receipt total " + request.total() + " does not match items + tax - discount (" + expected + ")");
        }
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
