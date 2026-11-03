package com.fintrack.backend.repository;

import com.fintrack.backend.domain.ItemCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ItemCategoryRepository extends JpaRepository<ItemCategory, UUID> {
    List<ItemCategory> findByUserIdOrderByNameAsc(UUID userId);
    long countByUserIdAndIdIn(UUID userId, Collection<UUID> ids);
}
