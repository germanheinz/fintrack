package com.fintrack.backend.ai;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Keyword rules that stand in for fintrack_ai. Active when fintrack.ai.mode is stub (the default). */
@Component
@ConditionalOnProperty(name = "fintrack.ai.mode", havingValue = "stub", matchIfMissing = true)
public class StubCategorizationClient implements CategorizationClient {

    private static final BigDecimal MATCH = new BigDecimal("0.90");
    private static final BigDecimal NO_MATCH = new BigDecimal("0.30");
    private static final String FALLBACK = "Otros";

    // Order matters: the first matching rule wins.
    private static final Map<String, List<String>> RULES = new LinkedHashMap<>();

    static {
        RULES.put("Huevos", List.of("huevo"));
        RULES.put("Lácteos", List.of("leche", "yogur", "queso", "mantequilla", "nata"));
        RULES.put("Carnes y pescado", List.of("pollo", "carne", "ternera", "cerdo", "jamon", "pescado", "atun", "salmon", "filet"));
        RULES.put("Frutas y verduras", List.of("tomate", "lechuga", "manzana", "platano", "naranja", "cebolla", "patata", "fruta", "verdura"));
        RULES.put("Panadería y repostería", List.of("pan ", "bolleria", "croissant"));
        RULES.put("Bebidas sin alcohol", List.of("cola", "refresco", "agua", "zumo", "cafe"));
        RULES.put("Bebidas alcohólicas", List.of("cerveza", "vino"));
        RULES.put("Limpieza del hogar", List.of("detergente", "lejia", "fregasuelos"));
        RULES.put("Higiene y cuidado personal", List.of("champu", "jabon", "dentifrico"));
        RULES.put("Despensa", List.of("arroz", "pasta", "aceite", "lenteja", "garbanzo", "harina"));
        RULES.put("Snacks y dulces", List.of("galleta", "chocolate", "snack"));
    }

    @Override
    public CategorizationResponse categorize(CategorizationRequest request) {
        List<CategorizationResponse.Item> items = request.items().stream()
                .map(item -> classify(item.position(), item.rawName()))
                .toList();
        return new CategorizationResponse(items, "stub-keywords", "1");
    }

    private CategorizationResponse.Item classify(int position, String rawName) {
        String text = normalize(rawName) + " ";
        for (Map.Entry<String, List<String>> rule : RULES.entrySet()) {
            if (rule.getValue().stream().anyMatch(text::contains)) {
                return new CategorizationResponse.Item(position, rule.getKey(), MATCH);
            }
        }
        return new CategorizationResponse.Item(position, FALLBACK, NO_MATCH);
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
