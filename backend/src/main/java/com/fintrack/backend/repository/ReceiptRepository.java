package com.fintrack.backend.repository;

import com.fintrack.backend.domain.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReceiptRepository extends JpaRepository<Receipt, UUID> {
    Optional<Receipt> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);
}
