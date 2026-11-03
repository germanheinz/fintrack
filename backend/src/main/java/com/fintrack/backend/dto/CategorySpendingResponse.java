package com.fintrack.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CategorySpendingResponse(UUID categoryId, String categoryName, BigDecimal total) {
}
