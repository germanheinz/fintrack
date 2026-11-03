package com.fintrack.backend.controller;

import com.fintrack.backend.dto.CategorySpendingResponse;
import com.fintrack.backend.dto.ItemSpendingResponse;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final CurrentUserProvider currentUser;

    public ReportController(ReportService reportService, CurrentUserProvider currentUser) {
        this.reportService = reportService;
        this.currentUser = currentUser;
    }

    /** Total expenses per category (Groceries, Parking, ...) in the date range, both ends included. */
    @GetMapping("/spending-by-category")
    public List<CategorySpendingResponse> spendingByCategory(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.spendingByCategory(currentUser.getUserId(), from, to);
    }

    /** Receipt item spending inside one category, grouped by item category. */
    @GetMapping("/spending-by-category/{categoryId}/items")
    public List<ItemSpendingResponse> spendingByItemCategory(
            @PathVariable UUID categoryId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return reportService.spendingByItemCategory(currentUser.getUserId(), categoryId, from, to);
    }
}
