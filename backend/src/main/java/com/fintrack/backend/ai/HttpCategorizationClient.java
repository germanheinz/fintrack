package com.fintrack.backend.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** Calls the fintrack_ai service. Active when fintrack.ai.mode is http. */
@Component
@ConditionalOnProperty(name = "fintrack.ai.mode", havingValue = "http")
public class HttpCategorizationClient implements CategorizationClient {

    private final RestClient restClient;

    @Autowired
    public HttpCategorizationClient(
            @Value("${fintrack.ai.base-url}") String baseUrl,
            @Value("${fintrack.ai.token}") String token,
            @Value("${fintrack.ai.timeout-seconds:30}") long timeoutSeconds
    ) {
        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        // A language model can take several seconds, so the read timeout is long.
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("X-Internal-Token", token)
                .build();
    }

    HttpCategorizationClient(RestClient restClient) {
        this.restClient = restClient;
    }

    @Override
    public CategorizationResponse categorize(CategorizationRequest request) {
        // A 4xx or 5xx answer throws. The outbox worker then retries the event.
        CategorizationResponse response = restClient.post()
                .uri("/categorize")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(CategorizationResponse.class);
        if (response == null) {
            throw new IllegalStateException("Empty answer from the AI service");
        }
        return response;
    }
}
