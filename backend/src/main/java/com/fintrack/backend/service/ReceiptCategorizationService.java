package com.fintrack.backend.service;

import com.fintrack.backend.ai.CategorizationRequest;
import com.fintrack.backend.ai.CategorizationResponse;
import com.fintrack.backend.domain.ItemCategory;
import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.domain.OutboxStatus;
import com.fintrack.backend.domain.Receipt;
import com.fintrack.backend.domain.ReceiptItem;
import com.fintrack.backend.domain.ReceiptStatus;
import com.fintrack.backend.domain.Transaction;
import com.fintrack.backend.repository.ItemCategoryRepository;
import com.fintrack.backend.repository.OutboxEventRepository;
import com.fintrack.backend.repository.ReceiptItemRepository;
import com.fintrack.backend.repository.ReceiptRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The database steps around the AI call. The call itself runs between prepare() and complete(),
 * outside any transaction, so a slow model never holds a database connection.
 */
@Service
public class ReceiptCategorizationService {

    private static final int MAX_ERROR_LENGTH = 500;

    private final OutboxEventRepository outboxEventRepository;
    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final TransactionRepository transactionRepository;
    private final ItemCategoryRepository itemCategoryRepository;
    private final BigDecimal confidenceThreshold;
    private final int maxAttempts;
    private final long backoffBaseSeconds;

    public ReceiptCategorizationService(
            OutboxEventRepository outboxEventRepository,
            ReceiptRepository receiptRepository,
            ReceiptItemRepository receiptItemRepository,
            TransactionRepository transactionRepository,
            ItemCategoryRepository itemCategoryRepository,
            @Value("${fintrack.ai.confidence-threshold:0.7}") BigDecimal confidenceThreshold,
            @Value("${fintrack.outbox.max-attempts:5}") int maxAttempts,
            @Value("${fintrack.outbox.backoff-base-seconds:5}") long backoffBaseSeconds
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.receiptRepository = receiptRepository;
        this.receiptItemRepository = receiptItemRepository;
        this.transactionRepository = transactionRepository;
        this.itemCategoryRepository = itemCategoryRepository;
        this.confidenceThreshold = confidenceThreshold;
        this.maxAttempts = maxAttempts;
        this.backoffBaseSeconds = backoffBaseSeconds;
    }

    /** Step 2: read everything the AI needs and mark the receipt as in progress. */
    @Transactional
    public CategorizationRequest prepare(UUID eventId) {
        OutboxEvent event = findEvent(eventId);
        Receipt receipt = findReceipt(event);
        receipt.setStatus(ReceiptStatus.CATEGORIZING);

        Transaction transaction = transactionRepository.findById(receipt.getTransactionId())
                .orElseThrow(() -> new IllegalStateException("Transaction not found: " + receipt.getTransactionId()));
        List<CategorizationRequest.Item> items = receiptItemRepository
                .findByReceiptIdAndUserIdOrderByPositionAsc(receipt.getId(), event.getUserId()).stream()
                .map(item -> new CategorizationRequest.Item(
                        item.getPosition(), item.getRawName(), item.getQuantity(), item.getLineTotal()))
                .toList();
        List<String> itemCategories = itemCategoryRepository.findByUserIdOrderByNameAsc(event.getUserId()).stream()
                .map(ItemCategory::getName)
                .toList();

        return new CategorizationRequest(
                event.getUserId(), receipt.getId(), transaction.getDescription(), items, itemCategories);
    }

    /** Step 4: store the answer. Doubtful or unknown answers send the receipt to human review. */
    @Transactional
    public void complete(UUID eventId, CategorizationResponse response) {
        OutboxEvent event = findEvent(eventId);
        Receipt receipt = findReceipt(event);

        Map<String, UUID> categoryIdByName = itemCategoryRepository.findByUserIdOrderByNameAsc(event.getUserId())
                .stream().collect(Collectors.toMap(ItemCategory::getName, ItemCategory::getId));
        Map<Integer, ReceiptItem> itemByPosition = receiptItemRepository
                .findByReceiptIdAndUserIdOrderByPositionAsc(receipt.getId(), event.getUserId()).stream()
                .collect(Collectors.toMap(ReceiptItem::getPosition, Function.identity()));

        Map<Integer, CategorizationResponse.Item> answers = new HashMap<>();
        response.items().forEach(answer -> answers.put(answer.position(), answer));

        boolean needsReview = false;
        for (ReceiptItem item : itemByPosition.values()) {
            CategorizationResponse.Item answer = answers.get(item.getPosition());
            UUID categoryId = answer == null ? null : categoryIdByName.get(answer.itemCategory());
            item.setItemCategoryId(categoryId);
            item.setConfidence(answer == null ? null : answer.confidence());

            boolean confident = answer != null && answer.confidence() != null
                    && answer.confidence().compareTo(confidenceThreshold) >= 0;
            if (categoryId == null || !confident) {
                needsReview = true;
            }
        }

        receipt.setStatus(needsReview ? ReceiptStatus.NEEDS_REVIEW : ReceiptStatus.CATEGORIZED);
        event.setStatus(OutboxStatus.DONE);
        event.setProcessedAt(Instant.now());
        event.setLockedUntil(null);
        event.setLastError(null);
    }

    /** A failed attempt retries later with a growing delay. The last attempt gives up. */
    @Transactional
    public void fail(UUID eventId, Exception cause) {
        OutboxEvent event = findEvent(eventId);
        event.setLastError(truncate(String.valueOf(cause.getMessage())));
        event.setLockedUntil(null);

        if (event.getAttempts() >= maxAttempts) {
            event.setStatus(OutboxStatus.FAILED);
            event.setProcessedAt(Instant.now());
            receiptRepository.findById(event.getAggregateId())
                    .ifPresent(receipt -> receipt.setStatus(ReceiptStatus.NEEDS_REVIEW));
            return;
        }

        long delaySeconds = backoffBaseSeconds * (1L << Math.min(event.getAttempts() - 1, 10));
        event.setStatus(OutboxStatus.PENDING);
        event.setNextAttemptAt(Instant.now().plusSeconds(delaySeconds));
    }

    private OutboxEvent findEvent(UUID eventId) {
        return outboxEventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalStateException("Outbox event not found: " + eventId));
    }

    private Receipt findReceipt(OutboxEvent event) {
        return receiptRepository.findById(event.getAggregateId())
                .filter(receipt -> receipt.getUserId().equals(event.getUserId()))
                .orElseThrow(() -> new IllegalStateException("Receipt not found: " + event.getAggregateId()));
    }

    private static String truncate(String text) {
        return text.length() <= MAX_ERROR_LENGTH ? text : text.substring(0, MAX_ERROR_LENGTH);
    }
}
