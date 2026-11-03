package com.fintrack.backend.service;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.dto.CategoryRequest;
import com.fintrack.backend.repository.CategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> listForUser(UUID userId) {
        return categoryRepository.findByUserIdOrderByTypeAscNameAsc(userId);
    }

    public Category create(UUID userId, CategoryRequest request) {
        Category category = Category.builder()
                .userId(userId)
                .name(request.name())
                .icon(request.icon())
                .color(request.color())
                .type(request.type())
                .isDefault(false)
                .build();
        return categoryRepository.save(category);
    }
}
