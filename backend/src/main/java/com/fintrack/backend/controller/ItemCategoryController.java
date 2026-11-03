package com.fintrack.backend.controller;

import com.fintrack.backend.dto.ItemCategoryResponse;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.ItemCategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/item-categories")
public class ItemCategoryController {

    private final ItemCategoryService itemCategoryService;
    private final CurrentUserProvider currentUser;

    public ItemCategoryController(ItemCategoryService itemCategoryService, CurrentUserProvider currentUser) {
        this.itemCategoryService = itemCategoryService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ItemCategoryResponse> list() {
        return itemCategoryService.listForUser(currentUser.getUserId()).stream()
                .map(ItemCategoryResponse::from)
                .toList();
    }
}
