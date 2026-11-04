package com.fintrack.backend.service;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.dto.CategoryRequest;
import com.fintrack.backend.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    // A user without categories gets the defaults, so the receipt screen never has an empty list.
    @Transactional
    public List<Category> listForUser(UUID userId) {
        List<Category> categories = categoryRepository.findByUserIdOrderByTypeAscNameAsc(userId);
        if (!categories.isEmpty()) {
            return categories;
        }
        seedDefaults(userId);
        return categoryRepository.findByUserIdOrderByTypeAscNameAsc(userId);
    }

    public void seedDefaults(UUID userId) {
        DefaultCategories.ALL.forEach(seed -> categoryRepository.save(
                Category.builder()
                        .userId(userId)
                        .name(seed.name())
                        .icon(seed.icon())
                        .color(seed.color())
                        .type(seed.type())
                        .isDefault(true)
                        .build()
        ));
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
