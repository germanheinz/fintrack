package com.fintrack.backend.dto;

import com.fintrack.backend.domain.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CategoryRequest(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Icon is required") String icon,
        @NotBlank(message = "Color is required") String color,
        @NotNull(message = "Type is required") CategoryType type
) {
}
