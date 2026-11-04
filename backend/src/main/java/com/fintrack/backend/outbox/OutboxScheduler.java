package com.fintrack.backend.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Runs the worker on a timer. Tests turn it off and call OutboxWorker.poll() themselves. */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "fintrack.outbox.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxScheduler {

    private static final Logger log = LoggerFactory.getLogger(OutboxScheduler.class);

    private final OutboxWorker worker;

    public OutboxScheduler(OutboxWorker worker) {
        this.worker = worker;
    }

    @Scheduled(fixedDelayString = "${fintrack.outbox.poll-interval-ms:2000}")
    public void run() {
        try {
            worker.poll();
        } catch (Exception e) {
            log.error("Outbox pass failed", e);
        }
    }
}
