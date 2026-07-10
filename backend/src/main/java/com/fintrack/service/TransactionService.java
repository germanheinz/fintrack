package com.fintrack.service;

import com.fintrack.dto.TransactionDto;
import com.fintrack.entity.Category;
import com.fintrack.entity.Transaction;
import com.fintrack.entity.TransactionType;
import com.fintrack.entity.User;
import com.fintrack.repository.CategoryRepository;
import com.fintrack.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public Page<TransactionDto> list(
        User user,
        Integer month,
        Integer year,
        TransactionType type,
        UUID categoryId,
        int page,
        int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return transactionRepository
            .findByFilters(user, month, year, type, categoryId, pageable)
            .map(this::toDto);
    }

    public TransactionDto getById(UUID id, User user) {
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new NoSuchElementException("Transaction not found: " + id));
        return toDto(transaction);
    }

    @Transactional
    public TransactionDto create(TransactionDto dto, User user) {
        Category category = categoryRepository.findByIdAndUser(dto.categoryId(), user)
            .orElseThrow(() -> new NoSuchElementException("Category not found: " + dto.categoryId()));

        Transaction transaction = Transaction.builder()
            .amount(dto.amount())
            .description(dto.description())
            .date(dto.date())
            .type(dto.type())
            .category(category)
            .user(user)
            .build();

        return toDto(transactionRepository.save(transaction));
    }

    @Transactional
    public TransactionDto update(UUID id, TransactionDto dto, User user) {
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new NoSuchElementException("Transaction not found: " + id));

        Category category = categoryRepository.findByIdAndUser(dto.categoryId(), user)
            .orElseThrow(() -> new NoSuchElementException("Category not found: " + dto.categoryId()));

        transaction.setAmount(dto.amount());
        transaction.setDescription(dto.description());
        transaction.setDate(dto.date());
        transaction.setType(dto.type());
        transaction.setCategory(category);

        return toDto(transactionRepository.save(transaction));
    }

    @Transactional
    public void delete(UUID id, User user) {
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new NoSuchElementException("Transaction not found: " + id));
        transactionRepository.delete(transaction);
    }

    public TransactionDto toDto(Transaction t) {
        return new TransactionDto(
            t.getId(),
            t.getAmount(),
            t.getDescription(),
            t.getDate(),
            t.getType(),
            t.getCategory().getId(),
            t.getCategory().getName(),
            t.getCategory().getIcon(),
            t.getCategory().getColor(),
            t.getCreatedAt()
        );
    }
}
