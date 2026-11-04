package com.fintrack.backend.outbox;

import com.fintrack.backend.domain.OutboxEvent;
import com.fintrack.backend.domain.OutboxStatus;
import com.fintrack.backend.repository.OutboxEventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/** Step 1 of the worker: take a batch of events and mark them as ours, in one short transaction. */
@Service
public class OutboxClaimService {

    private final OutboxEventRepository outboxEventRepository;
    private final int batchSize;
    private final long leaseSeconds;

    public OutboxClaimService(
            OutboxEventRepository outboxEventRepository,
            @Value("${fintrack.outbox.batch-size:10}") int batchSize,
            @Value("${fintrack.outbox.lease-seconds:60}") long leaseSeconds
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.batchSize = batchSize;
        this.leaseSeconds = leaseSeconds;
    }

    @Transactional
    public List<OutboxEvent> claimBatch() {
        Instant now = Instant.now();
        outboxEventRepository.requeueExpired(now);

        List<OutboxEvent> events = outboxEventRepository.lockPending(now, batchSize);
        for (OutboxEvent event : events) {
            event.setStatus(OutboxStatus.PROCESSING);
            event.setAttempts(event.getAttempts() + 1);
            event.setLockedUntil(now.plusSeconds(leaseSeconds));
        }
        return events;
    }
}
