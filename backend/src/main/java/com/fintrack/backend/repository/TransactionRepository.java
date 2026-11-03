package com.fintrack.backend.repository;

import com.fintrack.backend.domain.Transaction;
import com.fintrack.backend.dto.CategorySpendingResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    // user_id siempre en el WHERE: aislamiento por usuario, el mismo principio
    // que corrige el bug de transaction_embeddings documentado en AI-ROADMAP.md
    List<Transaction> findByUserIdOrderByTransactionDateDesc(UUID userId);
    boolean existsByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select new com.fintrack.backend.dto.CategorySpendingResponse(c.id, c.name, sum(t.amount))
            from Transaction t
                join Category c on c.id = t.categoryId
            where t.userId = :userId
                and t.type = com.fintrack.backend.domain.CategoryType.EXPENSE
                and t.transactionDate between :startDate and :endDate
            group by c.id, c.name
            order by sum(t.amount) desc
            """)
    List<CategorySpendingResponse> sumExpensesByCategory(
            @Param("userId") UUID userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
