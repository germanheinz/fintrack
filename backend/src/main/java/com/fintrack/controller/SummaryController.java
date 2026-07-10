package com.fintrack.controller;

import com.fintrack.dto.MonthlySummaryDto;
import com.fintrack.entity.Transaction;
import com.fintrack.entity.TransactionType;
import com.fintrack.entity.User;
import com.fintrack.repository.TransactionRepository;
import com.fintrack.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/summary")
@RequiredArgsConstructor
public class SummaryController {

    private final TransactionRepository transactionRepository;
    private final UserService userService;

    @GetMapping("/monthly")
    public ResponseEntity<MonthlySummaryDto> monthly(
        @RequestParam int month,
        @RequestParam int year,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());

        List<Transaction> transactions = transactionRepository.findByUserAndMonthAndYear(user, month, year);

        BigDecimal totalIncome = transactions.stream()
            .filter(t -> t.getType() == TransactionType.INCOME)
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalExpenses = transactions.stream()
            .filter(t -> t.getType() == TransactionType.EXPENSE)
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal balance = totalIncome.subtract(totalExpenses);

        BigDecimal savingsRate = totalIncome.compareTo(BigDecimal.ZERO) > 0
            ? balance.divide(totalIncome, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
            : BigDecimal.ZERO;

        // Group expenses by category
        Map<UUID, List<Transaction>> expensesByCategory = transactions.stream()
            .filter(t -> t.getType() == TransactionType.EXPENSE)
            .collect(Collectors.groupingBy(t -> t.getCategory().getId()));

        List<MonthlySummaryDto.CategorySummary> categorySummaries = new ArrayList<>();
        for (Map.Entry<UUID, List<Transaction>> entry : expensesByCategory.entrySet()) {
            List<Transaction> categoryTransactions = entry.getValue();
            Transaction first = categoryTransactions.get(0);
            BigDecimal categoryTotal = categoryTransactions.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal percentage = totalExpenses.compareTo(BigDecimal.ZERO) > 0
                ? categoryTotal.divide(totalExpenses, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

            categorySummaries.add(new MonthlySummaryDto.CategorySummary(
                first.getCategory().getId(),
                first.getCategory().getName(),
                first.getCategory().getIcon(),
                first.getCategory().getColor(),
                categoryTotal,
                percentage
            ));
        }

        categorySummaries.sort((a, b) -> b.total().compareTo(a.total()));

        MonthlySummaryDto summary = new MonthlySummaryDto(
            totalIncome,
            totalExpenses,
            balance,
            savingsRate.setScale(2, RoundingMode.HALF_UP),
            transactions.size(),
            categorySummaries
        );

        return ResponseEntity.ok(summary);
    }
}
