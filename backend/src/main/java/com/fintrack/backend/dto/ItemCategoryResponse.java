package com.fintrack.backend.dto;

import com.fintrack.backend.domain.ItemCategory;

import java.util.UUID;

public record ItemCategoryResponse(UUID id, String name, boolean isDefault) {
    public static ItemCategoryResponse from(ItemCategory category) {
        return new ItemCategoryResponse(category.getId(), category.getName(), category.isDefault());
    }
}
