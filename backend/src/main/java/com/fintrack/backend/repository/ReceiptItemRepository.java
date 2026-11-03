package com.fintrack.backend.repository;

import com.fintrack.backend.domain.ReceiptItem;
import com.fintrack.backend.dto.ItemSpendingResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReceiptItemRepository extends JpaRepository<ReceiptItem, UUID> {

    List<ReceiptItem> findByReceiptIdAndUserIdOrderByPositionAsc(UUID receiptId, UUID userId);

    // Items without an item category are grouped in one row with a null id.
    @Query("""
            select new com.fintrack.backend.dto.ItemSpendingResponse(
                ic.id, coalesce(ic.name, 'Uncategorized'), sum(ri.lineTotal))
            from ReceiptItem ri
                join Receipt r on r.id = ri.receiptId
                join Transaction t on t.id = r.transactionId
                left join ItemCategory ic on ic.id = ri.itemCategoryId
            where ri.userId = :userId
                and t.userId = :userId
                and t.categoryId = :categoryId
                and t.transactionDate between :startDate and :endDate
            group by ic.id, ic.name
            order by sum(ri.lineTotal) desc
            """)
    List<ItemSpendingResponse> sumByItemCategory(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
