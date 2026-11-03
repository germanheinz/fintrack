package com.fintrack.backend.service;

import com.fintrack.backend.domain.Transaction;
import com.fintrack.backend.dto.TransactionRequest;
import com.fintrack.backend.exception.ResourceNotFoundException;
import com.fintrack.backend.repository.CategoryRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
    }

    public List<Transaction> listForUser(UUID userId) {
        return transactionRepository.findByUserIdOrderByTransactionDateDesc(userId);
    }

    public Transaction create(UUID userId, TransactionRequest request) {
        // La categoría tiene que ser del mismo usuario: sin este check, un id ajeno
        // pasaría la validación de @NotNull y rompería el aislamiento por usuario.
        if (!categoryRepository.existsByIdAndUserId(request.categoryId(), userId)) {
            throw new ResourceNotFoundException("Category not found: " + request.categoryId());
        }

        Transaction transaction = Transaction.builder()
                .userId(userId)
                .categoryId(request.categoryId())
                .amount(request.amount())
                .description(request.description())
                .transactionDate(request.transactionDate())
                .type(request.type())
                .build();
        return transactionRepository.save(transaction);
    }
}
