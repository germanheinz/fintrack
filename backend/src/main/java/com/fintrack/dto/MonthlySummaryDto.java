package com.fintrack.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record MonthlySummaryDto(
    BigDecimal totalIncome,
    BigDecimal totalExpenses,
    BigDecimal balance,
    BigDecimal savingsRate,
    long transactionCount,
    List<CategorySummary> expensesByCategory
) {

    public record CategorySummary(
        UUID categoryId,
        String categoryName,
        String categoryIcon,
        String categoryColor,
        BigDecimal total,
        BigDecimal percentage
    ) {}
}
