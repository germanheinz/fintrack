package com.fintrack.backend.dto;

public record MigrationResult(
        int categoriesCreated,
        int categoriesReused,
        int transactionsImported,
        int transactionsSkippedAsDuplicate
) {
}
