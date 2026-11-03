package com.fintrack.backend.service;

import com.fintrack.backend.domain.ItemCategory;
import com.fintrack.backend.repository.ItemCategoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ItemCategoryService {

    private final ItemCategoryRepository itemCategoryRepository;

    public ItemCategoryService(ItemCategoryRepository itemCategoryRepository) {
        this.itemCategoryRepository = itemCategoryRepository;
    }

    public List<ItemCategory> listForUser(UUID userId) {
        return itemCategoryRepository.findByUserIdOrderByNameAsc(userId);
    }
}
