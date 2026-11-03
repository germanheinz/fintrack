package com.fintrack.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ItemSpendingResponse(UUID itemCategoryId, String itemCategoryName, BigDecimal total) {
}
