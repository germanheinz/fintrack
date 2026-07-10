package com.fintrack.controller;

import com.fintrack.dto.TransactionDto;
import com.fintrack.entity.TransactionType;
import com.fintrack.entity.User;
import com.fintrack.service.TransactionService;
import com.fintrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<TransactionDto>> list(
        @RequestParam(required = false) Integer month,
        @RequestParam(required = false) Integer year,
        @RequestParam(required = false) TransactionType type,
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        Page<TransactionDto> result = transactionService.list(user, month, year, type, categoryId, page, size);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionDto> getById(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(transactionService.getById(id, user));
    }

    @PostMapping
    public ResponseEntity<TransactionDto> create(
        @Valid @RequestBody TransactionDto dto,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        TransactionDto created = transactionService.create(dto, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransactionDto> update(
        @PathVariable UUID id,
        @Valid @RequestBody TransactionDto dto,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        TransactionDto updated = transactionService.update(id, dto, user);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        transactionService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
