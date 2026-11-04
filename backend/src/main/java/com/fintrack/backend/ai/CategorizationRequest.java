package com.fintrack.backend.ai;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Contract with the AI service. Items are matched by position, because names can repeat. */
public record CategorizationRequest(
        UUID userId,
        UUID receiptId,
        String merchant,
        List<Item> items,
        // Names the model may answer with. Anything else is rejected.
        List<String> itemCategories
) {
    public record Item(int position, String rawName, BigDecimal quantity, BigDecimal lineTotal) {
    }
}
