package com.fintrack.backend;

import com.fintrack.backend.ai.CategorizationClient;
import com.fintrack.backend.ai.CategorizationResponse;
import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.domain.OutboxStatus;
import com.fintrack.backend.domain.ReceiptStatus;
import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.CategoryResponse;
import com.fintrack.backend.dto.ReceiptRequest;
import com.fintrack.backend.dto.ReceiptRequest.ReceiptItemRequest;
import com.fintrack.backend.dto.ReceiptResponse;
import com.fintrack.backend.dto.RegisterRequest;
import com.fintrack.backend.outbox.OutboxWorker;
import com.fintrack.backend.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "fintrack.outbox.max-attempts=2")
@AutoConfigureTestRestTemplate
@Testcontainers
class OutboxWorkerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private OutboxWorker worker;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @MockitoBean
    private CategorizationClient client;

    private static CategorizationResponse answer(String first, String firstConfidence, String second, String secondConfidence) {
        return new CategorizationResponse(List.of(
                new CategorizationResponse.Item(0, first, new BigDecimal(firstConfidence)),
                new CategorizationResponse.Item(1, second, new BigDecimal(secondConfidence))), "test", "1");
    }

    @Test
    void confidentAnswer_categorizesTheItemsAndMarksTheEventDone() {
        Session session = newSession("worker-ok@fintrack.test");
        when(client.categorize(any())).thenReturn(answer("Huevos", "0.95", "Bebidas sin alcohol", "0.90"));
        ReceiptResponse receipt = createReceipt(session, "key-ok");

        worker.poll();

        ReceiptResponse stored = getReceipt(session, receipt.id());
        assertThat(stored.status()).isEqualTo(ReceiptStatus.CATEGORIZED);
        assertThat(stored.items()).allSatisfy(item -> assertThat(item.itemCategoryId()).isNotNull());
        assertThat(eventOf(receipt).getStatus()).isEqualTo(OutboxStatus.DONE);
    }

    @Test
    void lowConfidence_sendsTheReceiptToReview() {
        Session session = newSession("worker-low@fintrack.test");
        when(client.categorize(any())).thenReturn(answer("Huevos", "0.95", "Otros", "0.30"));
        ReceiptResponse receipt = createReceipt(session, "key-low");

        worker.poll();

        assertThat(getReceipt(session, receipt.id()).status()).isEqualTo(ReceiptStatus.NEEDS_REVIEW);
        assertThat(eventOf(receipt).getStatus()).isEqualTo(OutboxStatus.DONE);
    }

    @Test
    void unknownCategoryName_isNotStoredAndNeedsReview() {
        Session session = newSession("worker-unknown@fintrack.test");
        when(client.categorize(any())).thenReturn(answer("Huevos", "0.95", "Inventada", "0.99"));
        ReceiptResponse receipt = createReceipt(session, "key-unknown");

        worker.poll();

        ReceiptResponse stored = getReceipt(session, receipt.id());
        assertThat(stored.status()).isEqualTo(ReceiptStatus.NEEDS_REVIEW);
        assertThat(stored.items().get(0).itemCategoryId()).isNotNull();
        assertThat(stored.items().get(1).itemCategoryId()).isNull();
    }

    @Test
    void failingClient_retriesLaterAndGivesUpAtTheLastAttempt() {
        Session session = newSession("worker-fail@fintrack.test");
        when(client.categorize(any())).thenThrow(new IllegalStateException("model down"));
        ReceiptResponse receipt = createReceipt(session, "key-fail");

        worker.poll();

        OutboxEvent afterFirst = eventOf(receipt);
        assertThat(afterFirst.getStatus()).isEqualTo(OutboxStatus.PENDING);
        assertThat(afterFirst.getAttempts()).isEqualTo(1);
        assertThat(afterFirst.getNextAttemptAt()).isAfter(Instant.now());
        assertThat(afterFirst.getLastError()).contains("model down");

        // The backoff delay has not passed, so another pass leaves the event alone.
        worker.poll();
        assertThat(eventOf(receipt).getAttempts()).isEqualTo(1);

        afterFirst.setNextAttemptAt(Instant.now().minusSeconds(1));
        outboxEventRepository.save(afterFirst);
        worker.poll();

        assertThat(eventOf(receipt).getStatus()).isEqualTo(OutboxStatus.FAILED);
        assertThat(getReceipt(session, receipt.id()).status()).isEqualTo(ReceiptStatus.NEEDS_REVIEW);
    }

    @Test
    void expiredLease_putsTheEventBackInTheQueue() {
        Session session = newSession("worker-lease@fintrack.test");
        when(client.categorize(any())).thenReturn(answer("Huevos", "0.95", "Bebidas sin alcohol", "0.90"));
        ReceiptResponse receipt = createReceipt(session, "key-lease");

        // A worker that took the event and died: PROCESSING with a lease in the past.
        OutboxEvent event = eventOf(receipt);
        event.setStatus(OutboxStatus.PROCESSING);
        event.setAttempts(1);
        event.setLockedUntil(Instant.now().minusSeconds(5));
        outboxEventRepository.save(event);

        worker.poll();

        assertThat(eventOf(receipt).getStatus()).isEqualTo(OutboxStatus.DONE);
        assertThat(getReceipt(session, receipt.id()).status()).isEqualTo(ReceiptStatus.CATEGORIZED);
    }

    private record Session(String token, UUID groceriesId) {
    }

    private Session newSession(String email) {
        AuthResponse auth = restTemplate.postForEntity(
                "/api/auth/register", new RegisterRequest("German", email, "secret123"), AuthResponse.class).getBody();
        ResponseEntity<CategoryResponse[]> categories = restTemplate.exchange(
                "/api/categories", HttpMethod.GET, new HttpEntity<>(bearer(auth.token())), CategoryResponse[].class);
        UUID groceries = Arrays.stream(categories.getBody())
                .filter(c -> c.name().equals("Groceries")).findFirst().orElseThrow().id();
        return new Session(auth.token(), groceries);
    }

    private ReceiptResponse createReceipt(Session session, String idempotencyKey) {
        var request = new ReceiptRequest("Mercadona", LocalDate.parse("2026-11-04"), session.groceriesId(),
                new BigDecimal("5.00"), null, null, List.of(
                        new ReceiptItemRequest("HUEVO L 12", null, new BigDecimal("3.00"), null),
                        new ReceiptItemRequest("COLA 2L", null, new BigDecimal("2.00"), null)), null);
        HttpHeaders headers = bearer(session.token());
        headers.set("Idempotency-Key", idempotencyKey);
        return restTemplate.exchange("/api/receipts", HttpMethod.POST, new HttpEntity<>(request, headers),
                ReceiptResponse.class).getBody();
    }

    private ReceiptResponse getReceipt(Session session, UUID receiptId) {
        return restTemplate.exchange("/api/receipts/" + receiptId, HttpMethod.GET,
                new HttpEntity<>(bearer(session.token())), ReceiptResponse.class).getBody();
    }

    private OutboxEvent eventOf(ReceiptResponse receipt) {
        return outboxEventRepository.findAll().stream()
                .filter(event -> event.getAggregateId().equals(receipt.id()))
                .findFirst().orElseThrow();
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }
}
