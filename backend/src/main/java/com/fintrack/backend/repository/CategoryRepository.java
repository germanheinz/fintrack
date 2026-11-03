package com.fintrack.backend.repository;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.domain.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByUserIdOrderByTypeAscNameAsc(UUID userId);
    boolean existsByIdAndUserId(UUID id, UUID userId);
    // Usado por la migración de backup: reconciliar por nombre en vez de duplicar
    Optional<Category> findByUserIdAndNameAndType(UUID userId, String name, CategoryType type);
}
