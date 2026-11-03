package com.fintrack.backend.controller;

import com.fintrack.backend.dto.TransactionRequest;
import com.fintrack.backend.dto.TransactionResponse;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final CurrentUserProvider currentUser;

    public TransactionController(TransactionService transactionService, CurrentUserProvider currentUser) {
        this.transactionService = transactionService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TransactionResponse> list() {
        return transactionService.listForUser(currentUser.getUserId()).stream()
                .map(TransactionResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionRequest request) {
        var created = transactionService.create(currentUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TransactionResponse.from(created));
    }
}
