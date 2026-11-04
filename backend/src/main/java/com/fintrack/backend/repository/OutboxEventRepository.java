package com.fintrack.backend.repository;

import com.fintrack.backend.domain.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    // SKIP LOCKED: two workers never take the same row, and neither waits for the other.
    @Query(value = """
            SELECT * FROM outbox_events
            WHERE status = 'PENDING' AND next_attempt_at <= :now
            ORDER BY created_at
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEvent> lockPending(@Param("now") Instant now, @Param("limit") int limit);

    // A worker that died leaves its events in PROCESSING. An expired lease puts them back.
    @Modifying
    @Query("""
            update OutboxEvent e
            set e.status = com.fintrack.backend.domain.OutboxStatus.PENDING, e.lockedUntil = null
            where e.status = com.fintrack.backend.domain.OutboxStatus.PROCESSING and e.lockedUntil < :now
            """)
    int requeueExpired(@Param("now") Instant now);
}
