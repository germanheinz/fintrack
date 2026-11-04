package com.fintrack.backend.ai;

/** Port to the AI service. The backend depends on this interface, never on a vendor. */
public interface CategorizationClient {

    /** Throws when the service fails. The outbox worker retries the event. */
    CategorizationResponse categorize(CategorizationRequest request);
}
