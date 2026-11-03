package com.fintrack.backend.controller;

import com.fintrack.backend.dto.CategoryRequest;
import com.fintrack.backend.dto.CategoryResponse;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;
    private final CurrentUserProvider currentUser;

    public CategoryController(CategoryService categoryService, CurrentUserProvider currentUser) {
        this.categoryService = categoryService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.listForUser(currentUser.getUserId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        var created = categoryService.create(currentUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryResponse.from(created));
    }
}
