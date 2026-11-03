package com.fintrack.backend.dto;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.domain.CategoryType;

import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        String icon,
        String color,
        CategoryType type,
        boolean isDefault
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getIcon(),
                category.getColor(),
                category.getType(),
                category.isDefault()
        );
    }
}
