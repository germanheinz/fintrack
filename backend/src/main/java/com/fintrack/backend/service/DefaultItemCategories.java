package com.fintrack.backend.service;

import java.util.List;

/** Keep in sync with the seed in db/migration/V2__receipts.sql. */
public final class DefaultItemCategories {

    private DefaultItemCategories() {
    }

    public static final List<String> NAMES = List.of(
            "Frutas y verduras",
            "Carnes y pescado",
            "Lácteos",
            "Huevos",
            "Panadería y repostería",
            "Despensa",
            "Congelados y platos preparados",
            "Bebidas sin alcohol",
            "Bebidas alcohólicas",
            "Snacks y dulces",
            "Limpieza del hogar",
            "Higiene y cuidado personal",
            "Mascotas",
            "Hogar y otros no alimentarios",
            "Otros"
    );
}
