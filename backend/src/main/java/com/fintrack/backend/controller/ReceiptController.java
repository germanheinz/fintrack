package com.fintrack.backend.controller;

import com.fintrack.backend.dto.ReceiptRequest;
import com.fintrack.backend.dto.ReceiptResponse;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.ReceiptService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final ReceiptService receiptService;
    private final CurrentUserProvider currentUser;

    public ReceiptController(ReceiptService receiptService, CurrentUserProvider currentUser) {
        this.receiptService = receiptService;
        this.currentUser = currentUser;
    }

    /** Status and categorized items. The app polls this while the receipt is being categorized. */
    @GetMapping("/{id}")
    public ReceiptResponse get(@PathVariable UUID id) {
        return receiptService.get(currentUser.getUserId(), id);
    }

    /** Returns 201 for a new receipt, or 200 with the stored receipt if the key was already used. */
    @PostMapping
    public ResponseEntity<ReceiptResponse> create(
            @RequestHeader("Idempotency-Key") @NotBlank @Size(max = 100) String idempotencyKey,
            @Valid @RequestBody ReceiptRequest request
    ) {
        var result = receiptService.create(currentUser.getUserId(), idempotencyKey, request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.receipt());
    }
}
