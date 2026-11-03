package com.fintrack.backend;

import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.domain.OutboxStatus;
import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.CategoryResponse;
import com.fintrack.backend.dto.CategorySpendingResponse;
import com.fintrack.backend.dto.ItemCategoryResponse;
import com.fintrack.backend.dto.ItemSpendingResponse;
import com.fintrack.backend.dto.ReceiptRequest;
import com.fintrack.backend.dto.ReceiptRequest.ReceiptItemRequest;
import com.fintrack.backend.dto.ReceiptResponse;
import com.fintrack.backend.dto.RegisterRequest;
import com.fintrack.backend.repository.OutboxEventRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Testcontainers
class ReceiptIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Test
    void register_seedsDefaultItemCategories() {
        String token = registerAndGetToken("items-seed@fintrack.test");

        assertThat(itemCategories(token)).hasSize(15); // DefaultItemCategories.NAMES
    }

    @Test
    void createReceipt_savesTransactionItemsAndOutboxEvent() {
        String token = registerAndGetToken("receipt-create@fintrack.test");
        UUID groceries = categoryId(token, "Groceries");
        UUID eggs = itemCategoryId(token, "Huevos");

        var request = receipt(groceries, "Mercadona", "2026-10-05", "12.50", null, null, List.of(
                item("HUEVO L 12", "3.50", eggs),
                item("COLA 2L", "9.00", null)));

        ResponseEntity<ReceiptResponse> response = postReceipt(token, "key-create-1", request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ReceiptResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status().name()).isEqualTo("SUBMITTED");
        assertThat(body.merchant()).isEqualTo("Mercadona");
        assertThat(body.total()).isEqualByComparingTo("12.50");
        assertThat(body.items()).extracting(ReceiptResponse.ReceiptItemResponse::rawName)
                .containsExactly("HUEVO L 12", "COLA 2L");

        List<OutboxEvent> events = outboxEventRepository.findAll().stream()
                .filter(e -> e.getAggregateId().equals(body.id()))
                .toList();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getStatus()).isEqualTo(OutboxStatus.PENDING);
        assertThat(events.get(0).getEventType()).isEqualTo("RECEIPT_SUBMITTED");
    }

    @Test
    void createReceipt_withSameIdempotencyKey_returnsStoredReceiptWithoutDuplicating() {
        String token = registerAndGetToken("receipt-idem@fintrack.test");
        UUID groceries = categoryId(token, "Groceries");
        var request = receipt(groceries, "Lidl", "2026-10-06", "5.00", null, null, List.of(item("PAN", "5.00", null)));

        ResponseEntity<ReceiptResponse> first = postReceipt(token, "key-idem-1", request);
        ResponseEntity<ReceiptResponse> second = postReceipt(token, "key-idem-1", request);

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(second.getBody().id()).isEqualTo(first.getBody().id());
        assertThat(second.getBody().items()).hasSize(1);
        assertThat(transactionRepository.findAll().stream()
                .filter(t -> t.getId().equals(first.getBody().transactionId()))).hasSize(1);
    }

    @Test
    void createReceipt_whenTotalDoesNotMatchItems_returns400() {
        String token = registerAndGetToken("receipt-mismatch@fintrack.test");
        UUID groceries = categoryId(token, "Groceries");
        var request = receipt(groceries, "Dia", "2026-10-07", "20.00", null, null, List.of(item("LECHE", "1.50", null)));

        ResponseEntity<Object> response = restTemplate.exchange(
                "/api/receipts", HttpMethod.POST, new HttpEntity<>(request, headers(token, "key-mismatch-1")), Object.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createReceipt_includesTaxAndDiscountInTotalCheck() {
        String token = registerAndGetToken("receipt-tax@fintrack.test");
        UUID groceries = categoryId(token, "Groceries");
        // 10.00 + 2.10 tax - 1.00 discount = 11.10
        var request = receipt(groceries, "Carrefour", "2026-10-08", "11.10", "2.10", "1.00",
                List.of(item("ACEITE", "10.00", null)));

        ResponseEntity<ReceiptResponse> response = postReceipt(token, "key-tax-1", request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void createReceipt_withItemCategoryOfAnotherUser_returns404() {
        String tokenA = registerAndGetToken("receipt-owner-a@fintrack.test");
        String tokenB = registerAndGetToken("receipt-owner-b@fintrack.test");
        UUID groceriesB = categoryId(tokenB, "Groceries");
        UUID foreignItemCategory = itemCategoryId(tokenA, "Huevos");
        var request = receipt(groceriesB, "Dia", "2026-10-09", "3.00", null, null,
                List.of(item("HUEVOS", "3.00", foreignItemCategory)));

        ResponseEntity<Object> response = restTemplate.exchange(
                "/api/receipts", HttpMethod.POST, new HttpEntity<>(request, headers(tokenB, "key-foreign-1")), Object.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void reports_returnTotalsPerCategoryAndPerItemCategory() {
        String token = registerAndGetToken("receipt-report@fintrack.test");
        UUID groceries = categoryId(token, "Groceries");
        UUID eggs = itemCategoryId(token, "Huevos");
        UUID drinks = itemCategoryId(token, "Bebidas sin alcohol");

        postReceipt(token, "key-report-1", receipt(groceries, "Mercadona", "2026-11-02", "13.00", null, null, List.of(
                item("HUEVO L 12", "3.00", eggs),
                item("COLA 2L", "10.00", drinks))));
        postReceipt(token, "key-report-2", receipt(groceries, "Lidl", "2026-11-10", "7.00", null, null, List.of(
                item("HUEVOS 6", "2.00", eggs),
                item("BOLSA", "5.00", null))));
        // Outside the date range: must not count.
        postReceipt(token, "key-report-3", receipt(groceries, "Dia", "2026-12-01", "100.00", null, null,
                List.of(item("CARNE", "100.00", null))));

        ResponseEntity<CategorySpendingResponse[]> byCategory = restTemplate.exchange(
                "/api/reports/spending-by-category?from=2026-11-01&to=2026-11-30",
                HttpMethod.GET, new HttpEntity<>(bearer(token)), CategorySpendingResponse[].class);

        assertThat(byCategory.getBody()).hasSize(1);
        assertThat(byCategory.getBody()[0].categoryName()).isEqualTo("Groceries");
        assertThat(byCategory.getBody()[0].total()).isEqualByComparingTo("20.00");

        ResponseEntity<ItemSpendingResponse[]> byItem = restTemplate.exchange(
                "/api/reports/spending-by-category/" + groceries + "/items?from=2026-11-01&to=2026-11-30",
                HttpMethod.GET, new HttpEntity<>(bearer(token)), ItemSpendingResponse[].class);

        ItemSpendingResponse[] rows = byItem.getBody();
        assertThat(rows).hasSize(3);
        // Ordered by total, highest first: drinks 10, uncategorized 5, eggs 5 (3 + 2).
        assertThat(rows[0].itemCategoryName()).isEqualTo("Bebidas sin alcohol");
        assertThat(rows[0].total()).isEqualByComparingTo("10.00");
        assertThat(Arrays.stream(rows).filter(r -> "Huevos".equals(r.itemCategoryName())).findFirst().orElseThrow()
                .total()).isEqualByComparingTo("5.00");
        assertThat(Arrays.stream(rows).filter(r -> r.itemCategoryId() == null).findFirst().orElseThrow()
                .total()).isEqualByComparingTo("5.00");
    }

    @Test
    void itemReport_forCategoryOfAnotherUser_returns404() {
        String tokenA = registerAndGetToken("report-owner-a@fintrack.test");
        String tokenB = registerAndGetToken("report-owner-b@fintrack.test");
        UUID groceriesA = categoryId(tokenA, "Groceries");

        ResponseEntity<Object> response = restTemplate.exchange(
                "/api/reports/spending-by-category/" + groceriesA + "/items?from=2026-01-01&to=2026-12-31",
                HttpMethod.GET, new HttpEntity<>(bearer(tokenB)), Object.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    private ResponseEntity<ReceiptResponse> postReceipt(String token, String key, ReceiptRequest request) {
        return restTemplate.exchange("/api/receipts", HttpMethod.POST,
                new HttpEntity<>(request, headers(token, key)), ReceiptResponse.class);
    }

    private static ReceiptRequest receipt(UUID categoryId, String merchant, String date, String total,
                                          String tax, String discount, List<ReceiptItemRequest> items) {
        return new ReceiptRequest(merchant, LocalDate.parse(date), categoryId, new BigDecimal(total),
                tax == null ? null : new BigDecimal(tax),
                discount == null ? null : new BigDecimal(discount),
                items);
    }

    private static ReceiptItemRequest item(String name, String lineTotal, UUID itemCategoryId) {
        return new ReceiptItemRequest(name, null, new BigDecimal(lineTotal), itemCategoryId);
    }

    private UUID categoryId(String token, String name) {
        ResponseEntity<CategoryResponse[]> response = restTemplate.exchange(
                "/api/categories", HttpMethod.GET, new HttpEntity<>(bearer(token)), CategoryResponse[].class);
        return Arrays.stream(response.getBody()).filter(c -> c.name().equals(name)).findFirst().orElseThrow().id();
    }

    private UUID itemCategoryId(String token, String name) {
        return Arrays.stream(itemCategories(token)).filter(c -> c.name().equals(name)).findFirst().orElseThrow().id();
    }

    private ItemCategoryResponse[] itemCategories(String token) {
        return restTemplate.exchange("/api/item-categories", HttpMethod.GET,
                new HttpEntity<>(bearer(token)), ItemCategoryResponse[].class).getBody();
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    private static HttpHeaders headers(String token, String idempotencyKey) {
        HttpHeaders headers = bearer(token);
        headers.set("Idempotency-Key", idempotencyKey);
        return headers;
    }

    private String registerAndGetToken(String email) {
        var request = new RegisterRequest("German", email, "secret123");
        ResponseEntity<AuthResponse> response =
                restTemplate.postForEntity("/api/auth/register", request, AuthResponse.class);
        return response.getBody().token();
    }
}
