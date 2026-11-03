package com.fintrack.backend.service;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.domain.Transaction;
import com.fintrack.backend.dto.BackupImportRequest;
import com.fintrack.backend.dto.MigrationResult;
import com.fintrack.backend.repository.CategoryRepository;
import com.fintrack.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Importa el backup JSON que ya exporta mobile/src/db/localDb.js#exportUserData.
 * Reconcilia categorías por (nombre, tipo) en vez de duplicarlas — el registro ya
 * sembró las 19 por defecto, así que la mayoría del backup matchea por nombre y
 * se reutiliza el id existente en vez de crear una segunda "Groceries".
 * Las transacciones conservan el id local: si se corre el import dos veces,
 * la segunda corrida detecta los ids ya existentes y los saltea.
 */
@Service
public class MigrationService {

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    public MigrationService(CategoryRepository categoryRepository, TransactionRepository transactionRepository) {
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public MigrationResult importBackup(UUID userId, BackupImportRequest backup) {
        if (!"fintrack".equals(backup.app())) {
            throw new IllegalArgumentException("Unrecognized backup file (app=" + backup.app() + ")");
        }

        Map<UUID, UUID> localToBackendCategoryId = new HashMap<>();
        int created = 0;
        int reused = 0;

        for (BackupImportRequest.BackupCategory local : backup.categories()) {
            Category existing = categoryRepository
                    .findByUserIdAndNameAndType(userId, local.name(), local.type())
                    .orElse(null);

            if (existing != null) {
                localToBackendCategoryId.put(local.id(), existing.getId());
                reused++;
                continue;
            }

            Category saved = categoryRepository.save(Category.builder()
                    .userId(userId)
                    .name(local.name())
                    .icon(local.icon())
                    .color(local.color())
                    .type(local.type())
                    .isDefault(local.isDefault())
                    .build());
            localToBackendCategoryId.put(local.id(), saved.getId());
            created++;
        }

        int imported = 0;
        int skipped = 0;

        for (BackupImportRequest.BackupTransaction local : backup.transactions()) {
            if (transactionRepository.existsByIdAndUserId(local.id(), userId)) {
                skipped++;
                continue;
            }

            UUID categoryId = localToBackendCategoryId.get(local.categoryId());
            if (categoryId == null) {
                // Backup con una transacción apuntando a una categoría que no vino en el
                // mismo archivo — se salta en vez de romper todo el import.
                skipped++;
                continue;
            }

            transactionRepository.save(Transaction.builder()
                    .id(local.id()) // conserva el id local a propósito: es la clave de idempotencia
                    .userId(userId)
                    .categoryId(categoryId)
                    .amount(local.amount())
                    .description(local.description())
                    .transactionDate(local.date())
                    .type(local.type())
                    .build());
            imported++;
        }

        return new MigrationResult(created, reused, imported, skipped);
    }
}
