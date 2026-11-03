package com.fintrack.backend;

import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.LoginRequest;
import com.fintrack.backend.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Testcontainers
class AuthFlowIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:17-alpine"));

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void registerThenLogin_returnsWorkingTokenAndSeedsDefaultCategories() {
        String email = "surfer@fintrack.test";
        var registerRequest = new RegisterRequest("German", email, "secret123");

        ResponseEntity<AuthResponse> registerResponse =
                restTemplate.postForEntity("/api/auth/register", registerRequest, AuthResponse.class);

        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(registerResponse.getBody()).isNotNull();
        assertThat(registerResponse.getBody().token()).isNotBlank();

        var loginRequest = new LoginRequest(email, "secret123");
        ResponseEntity<AuthResponse> loginResponse =
                restTemplate.postForEntity("/api/auth/login", loginRequest, AuthResponse.class);

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        String token = loginResponse.getBody().token();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        ResponseEntity<Object[]> categoriesResponse = restTemplate.exchange(
                "/api/categories", org.springframework.http.HttpMethod.GET,
                new HttpEntity<>(headers), Object[].class);

        assertThat(categoriesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(categoriesResponse.getBody()).hasSize(19); // DefaultCategories.ALL
    }

    @Test
    void protectedEndpoint_withoutToken_returns401() {
        ResponseEntity<Object> response = restTemplate.getForEntity("/api/categories", Object.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void register_withDuplicateEmail_returns409() {
        String email = "duplicate@fintrack.test";
        var request = new RegisterRequest("German", email, "secret123");

        restTemplate.postForEntity("/api/auth/register", request, AuthResponse.class);
        ResponseEntity<Object> second = restTemplate.postForEntity("/api/auth/register", request, Object.class);

        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}
