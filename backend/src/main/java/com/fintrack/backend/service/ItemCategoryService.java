package com.fintrack.backend.service;

import com.fintrack.backend.domain.ItemCategory;
import com.fintrack.backend.repository.ItemCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ItemCategoryService {

    private final ItemCategoryRepository itemCategoryRepository;

    public ItemCategoryService(ItemCategoryRepository itemCategoryRepository) {
        this.itemCategoryRepository = itemCategoryRepository;
    }

    // A user without item categories gets the defaults, so the picker is never empty.
    @Transactional
    public List<ItemCategory> listForUser(UUID userId) {
        List<ItemCategory> categories = itemCategoryRepository.findByUserIdOrderByNameAsc(userId);
        if (!categories.isEmpty()) {
            return categories;
        }
        seedDefaults(userId);
        return itemCategoryRepository.findByUserIdOrderByNameAsc(userId);
    }

    public void seedDefaults(UUID userId) {
        DefaultItemCategories.NAMES.forEach(name -> itemCategoryRepository.save(
                ItemCategory.builder()
                        .userId(userId)
                        .name(name)
                        .isDefault(true)
                        .build()
        ));
    }
}
