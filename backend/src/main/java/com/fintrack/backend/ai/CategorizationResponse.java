package com.fintrack.backend.ai;

import java.math.BigDecimal;
import java.util.List;

public record CategorizationResponse(List<Item> items, String model, String modelVersion) {
    public record Item(int position, String itemCategory, BigDecimal confidence) {
    }
}
