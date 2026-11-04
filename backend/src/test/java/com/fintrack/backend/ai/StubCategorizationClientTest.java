package com.fintrack.backend.ai;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class StubCategorizationClientTest {

    private final StubCategorizationClient client = new StubCategorizationClient();

    private CategorizationResponse categorize(String... names) {
        var items = new java.util.ArrayList<CategorizationRequest.Item>();
        for (int i = 0; i < names.length; i++) {
            items.add(new CategorizationRequest.Item(i, names[i], null, BigDecimal.ONE));
        }
        return client.categorize(new CategorizationRequest(UUID.randomUUID(), UUID.randomUUID(), "Shop", items, List.of()));
    }

    @Test
    void knownProducts_getTheirCategoryWithHighConfidence() {
        CategorizationResponse response = categorize("HUEVOS L 12", "COLA 2L", "PAN BARRA", "LECHE ENTERA");

        assertThat(response.items()).extracting(CategorizationResponse.Item::itemCategory)
                .containsExactly("Huevos", "Bebidas sin alcohol", "Panadería y repostería", "Lácteos");
        assertThat(response.items()).allSatisfy(item -> assertThat(item.confidence()).isGreaterThanOrEqualTo(new BigDecimal("0.7")));
    }

    @Test
    void accentsAndCase_doNotMatter() {
        assertThat(categorize("Jamón serrano").items().get(0).itemCategory()).isEqualTo("Carnes y pescado");
    }

    @Test
    void unknownProduct_fallsBackToOtherWithLowConfidence() {
        CategorizationResponse.Item item = categorize("CREMA CARBASSA").items().get(0);

        assertThat(item.itemCategory()).isEqualTo("Otros");
        assertThat(item.confidence()).isLessThan(new BigDecimal("0.7"));
    }
}
