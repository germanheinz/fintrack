package com.fintrack.backend.outbox;

import com.fintrack.backend.ai.CategorizationClient;
import com.fintrack.backend.ai.CategorizationRequest;
import com.fintrack.backend.ai.CategorizationResponse;
import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.service.ReceiptCategorizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * One pass of the outbox: claim events, call the AI, store the result.
 * Each step is its own transaction, and the AI call has none.
 */
@Component
public class OutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    private final OutboxClaimService claimService;
    private final ReceiptCategorizationService categorizationService;
    private final CategorizationClient categorizationClient;

    public OutboxWorker(
            OutboxClaimService claimService,
            ReceiptCategorizationService categorizationService,
            CategorizationClient categorizationClient
    ) {
        this.claimService = claimService;
        this.categorizationService = categorizationService;
        this.categorizationClient = categorizationClient;
    }

    /** Returns how many events this pass took. */
    public int poll() {
        List<OutboxEvent> events = claimService.claimBatch();
        for (OutboxEvent event : events) {
            handle(event.getId());
        }
        return events.size();
    }

    private void handle(UUID eventId) {
        try {
            CategorizationRequest request = categorizationService.prepare(eventId);
            CategorizationResponse response = categorizationClient.categorize(request);
            categorizationService.complete(eventId, response);
        } catch (Exception e) {
            log.warn("Outbox event {} failed: {}", eventId, e.toString());
            categorizationService.fail(eventId, e);
        }
    }
}
