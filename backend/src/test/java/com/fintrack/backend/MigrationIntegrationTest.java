package com.fintrack.backend;

import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.MigrationResult;
import com.fintrack.backend.dto.RegisterRequest;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Testcontainers
class MigrationIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    private TestRestTemplate restTemplate;

    /**
     * Mismo shape que mobile/src/db/localDb.js#exportUserData. "Groceries" matchea
     * una de las 19 categorías que el registro ya sembró — no debe duplicarse.
     * "Side Hustle" es una categoría propia del usuario que no existe por defecto.
     */
    private static final String BACKUP_JSON = """
            {
              "app": "fintrack",
              "version": 1,
              "categories": [
                { "id": "11111111-1111-1111-1111-111111111111", "name": "Groceries", "icon": "\uD83D\uDED2", "color": "#F44336", "type": "EXPENSE", "is_default": true },
                { "id": "22222222-2222-2222-2222-222222222222", "name": "Side Hustle", "icon": "\uD83D\uDCBC", "color": "#2196F3", "type": "INCOME", "is_default": false }
              ],
              "transactions": [
                { "id": "33333333-3333-3333-3333-333333333333", "amount": 45.50, "description": "Mercadona", "date": "2026-09-01", "type": "EXPENSE", "category_id": "11111111-1111-1111-1111-111111111111" },
                { "id": "44444444-4444-4444-4444-444444444444", "amount": 200.00, "description": "Logo design gig", "date": "2026-09-03", "type": "INCOME", "category_id": "22222222-2222-2222-2222-222222222222" }
              ]
            }
            """;

    @Test
    void importBackup_isIdempotent_onSecondRun() {
        String token = registerAndGetToken("migration-user@fintrack.test");
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

        ResponseEntity<MigrationResult> first = restTemplate.exchange(
                "/api/migration/import-backup", HttpMethod.POST,
                new HttpEntity<>(BACKUP_JSON, headers), MigrationResult.class);

        assertThat(first.getBody()).isNotNull();
        assertThat(first.getBody().categoriesReused()).isEqualTo(1);   // Groceries
        assertThat(first.getBody().categoriesCreated()).isEqualTo(1);  // Side Hustle
        assertThat(first.getBody().transactionsImported()).isEqualTo(2);
        assertThat(first.getBody().transactionsSkippedAsDuplicate()).isZero();

        ResponseEntity<MigrationResult> second = restTemplate.exchange(
                "/api/migration/import-backup", HttpMethod.POST,
                new HttpEntity<>(BACKUP_JSON, headers), MigrationResult.class);

        assertThat(second.getBody()).isNotNull();
        assertThat(second.getBody().categoriesReused()).isEqualTo(2);  // ambas ya existen ahora
        assertThat(second.getBody().categoriesCreated()).isZero();
        assertThat(second.getBody().transactionsImported()).isZero();
        assertThat(second.getBody().transactionsSkippedAsDuplicate()).isEqualTo(2);
    }

    private String registerAndGetToken(String email) {
        var request = new RegisterRequest("German", email, "secret123");
        ResponseEntity<AuthResponse> response =
                restTemplate.postForEntity("/api/auth/register", request, AuthResponse.class);
        return response.getBody().token();
    }
}
