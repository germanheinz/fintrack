package com.fintrack.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fintrack.backend.domain.CategoryType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mismo shape que produce mobile/src/db/localDb.js#exportUserData — no lo cambies sin mirar ahí primero. */
public record BackupImportRequest(
        String app,
        int version,
        List<BackupCategory> categories,
        List<BackupTransaction> transactions
) {
    public record BackupCategory(
            UUID id,
            String name,
            String icon,
            String color,
            CategoryType type,
            @JsonProperty("is_default") boolean isDefault
    ) {
    }

    public record BackupTransaction(
            UUID id,
            BigDecimal amount,
            String description,
            LocalDate date,
            CategoryType type,
            @JsonProperty("category_id") UUID categoryId
    ) {
    }
}
