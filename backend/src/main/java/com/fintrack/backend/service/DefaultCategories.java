package com.fintrack.backend.service;

import com.fintrack.backend.domain.CategoryType;

import java.util.List;

/** Mismo set de categorías por defecto que ya exist&iacute;a en mobile/src/db/localDb.js. */
public final class DefaultCategories {

    private DefaultCategories() {
    }

    public record Seed(String name, String icon, String color, CategoryType type) {
    }

    public static final List<Seed> ALL = List.of(
            new Seed("Salary", "💼", "#4CAF50", CategoryType.INCOME),
            new Seed("Freelance", "💻", "#2196F3", CategoryType.INCOME),
            new Seed("Investments", "📈", "#9C27B0", CategoryType.INCOME),
            new Seed("Side Income", "🤝", "#00BCD4", CategoryType.INCOME),
            new Seed("Other Income", "💰", "#8BC34A", CategoryType.INCOME),
            new Seed("Rent / Mortgage", "🏠", "#3F51B5", CategoryType.EXPENSE),
            new Seed("Groceries", "🛒", "#F44336", CategoryType.EXPENSE),
            new Seed("Restaurants", "🍽️", "#FF5722", CategoryType.EXPENSE),
            new Seed("Transport", "🚗", "#FF9800", CategoryType.EXPENSE),
            new Seed("Fuel", "⛽", "#FFC107", CategoryType.EXPENSE),
            new Seed("Utilities", "💡", "#607D8B", CategoryType.EXPENSE),
            new Seed("Subscriptions", "📱", "#9C27B0", CategoryType.EXPENSE),
            new Seed("Health", "🏥", "#00BCD4", CategoryType.EXPENSE),
            new Seed("Pharmacy", "💊", "#E91E63", CategoryType.EXPENSE),
            new Seed("Clothing", "👕", "#795548", CategoryType.EXPENSE),
            new Seed("Entertainment", "🎬", "#E91E63", CategoryType.EXPENSE),
            new Seed("Travel", "✈️", "#03A9F4", CategoryType.EXPENSE),
            new Seed("Education", "📚", "#673AB7", CategoryType.EXPENSE),
            new Seed("Other", "📦", "#9E9E9E", CategoryType.EXPENSE)
    );
}
