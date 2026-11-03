package com.fintrack.backend.service;

import com.fintrack.backend.dto.CategorySpendingResponse;
import com.fintrack.backend.dto.ItemSpendingResponse;
import com.fintrack.backend.exception.BadRequestException;
import com.fintrack.backend.exception.ResourceNotFoundException;
import com.fintrack.backend.repository.CategoryRepository;
import com.fintrack.backend.repository.ReceiptItemRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final CategoryRepository categoryRepository;

    public ReportService(
            TransactionRepository transactionRepository,
            ReceiptItemRepository receiptItemRepository,
            CategoryRepository categoryRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.receiptItemRepository = receiptItemRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<CategorySpendingResponse> spendingByCategory(UUID userId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        return transactionRepository.sumExpensesByCategory(userId, from, to);
    }

    public List<ItemSpendingResponse> spendingByItemCategory(UUID userId, UUID categoryId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        if (!categoryRepository.existsByIdAndUserId(categoryId, userId)) {
            throw new ResourceNotFoundException("Category not found: " + categoryId);
        }
        return receiptItemRepository.sumByItemCategory(userId, categoryId, from, to);
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BadRequestException("'from' must not be after 'to'");
        }
    }
}
