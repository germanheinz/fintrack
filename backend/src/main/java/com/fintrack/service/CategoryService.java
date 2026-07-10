package com.fintrack.service;

import com.fintrack.dto.CategoryDto;
import com.fintrack.entity.Category;
import com.fintrack.entity.User;
import com.fintrack.repository.CategoryRepository;
import com.fintrack.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public List<CategoryDto> listByUser(User user) {
        return categoryRepository.findByUserOrderByTypeAscNameAsc(user)
            .stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public CategoryDto create(CategoryDto dto, User user) {
        Category category = Category.builder()
            .name(dto.name())
            .icon(dto.icon())
            .color(dto.color())
            .type(dto.type())
            .user(user)
            .isDefault(false)
            .build();

        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto update(UUID id, CategoryDto dto, User user) {
        Category category = categoryRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new NoSuchElementException("Category not found: " + id));

        category.setName(dto.name());
        category.setIcon(dto.icon());
        category.setColor(dto.color());
        category.setType(dto.type());

        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public void delete(UUID id, User user) {
        Category category = categoryRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new NoSuchElementException("Category not found: " + id));

        if (transactionRepository.existsByCategory(category)) {
            throw new IllegalStateException("Cannot delete category with existing transactions");
        }

        categoryRepository.delete(category);
    }

    public CategoryDto toDto(Category category) {
        return new CategoryDto(
            category.getId(),
            category.getName(),
            category.getIcon(),
            category.getColor(),
            category.getType(),
            category.isDefault(),
            category.getCreatedAt()
        );
    }
}
