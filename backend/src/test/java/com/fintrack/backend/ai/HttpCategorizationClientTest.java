package com.fintrack.backend.ai;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class HttpCategorizationClientTest {

    private final RestClient.Builder builder = RestClient.builder().baseUrl("http://ai.test");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final HttpCategorizationClient client = new HttpCategorizationClient(builder.build());

    private final CategorizationRequest request = new CategorizationRequest(
            UUID.randomUUID(), UUID.randomUUID(), "Mercadona",
            List.of(new CategorizationRequest.Item(0, "HUEVOS", null, new BigDecimal("3.00"))),
            List.of("Huevos", "Otros"));

    @Test
    void sendsTheContractAndReadsTheAnswer() {
        server.expect(requestTo("http://ai.test/categorize"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.items[0].rawName").value("HUEVOS"))
                .andExpect(jsonPath("$.itemCategories[0]").value("Huevos"))
                .andRespond(withSuccess("""
                        {"items":[{"position":0,"itemCategory":"Huevos","confidence":0.95}],
                         "model":"m","modelVersion":"1"}
                        """, MediaType.APPLICATION_JSON));

        CategorizationResponse response = client.categorize(request);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).itemCategory()).isEqualTo("Huevos");
        assertThat(response.items().get(0).confidence()).isEqualByComparingTo("0.95");
        server.verify();
    }

    @Test
    void aFailingService_throwsSoTheWorkerCanRetry() {
        server.expect(requestTo("http://ai.test/categorize")).andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        assertThatThrownBy(() -> client.categorize(request)).isInstanceOf(RestClientException.class);
    }
}
