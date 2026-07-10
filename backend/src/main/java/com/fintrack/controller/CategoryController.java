package com.fintrack.controller;

import com.fintrack.dto.CategoryDto;
import com.fintrack.entity.User;
import com.fintrack.service.CategoryService;
import com.fintrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<CategoryDto>> list(@AuthenticationPrincipal UserDetails principal) {
        User user = userService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(categoryService.listByUser(user));
    }

    @PostMapping
    public ResponseEntity<CategoryDto> create(
        @Valid @RequestBody CategoryDto dto,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        CategoryDto created = categoryService.create(dto, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryDto> update(
        @PathVariable UUID id,
        @Valid @RequestBody CategoryDto dto,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        CategoryDto updated = categoryService.update(id, dto, user);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @PathVariable UUID id,
        @AuthenticationPrincipal UserDetails principal
    ) {
        User user = userService.getCurrentUser(principal.getUsername());
        categoryService.delete(id, user);
        return ResponseEntity.noContent().build();
    }
}
