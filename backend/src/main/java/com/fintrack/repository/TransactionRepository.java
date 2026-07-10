package com.fintrack.repository;

import com.fintrack.entity.Category;
import com.fintrack.entity.Transaction;
import com.fintrack.entity.TransactionType;
import com.fintrack.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdAndUser(UUID id, User user);

    boolean existsByCategory(Category category);

    @Query("""
        SELECT t FROM Transaction t
        WHERE t.user = :user
          AND (:month IS NULL OR MONTH(t.date) = :month)
          AND (:year IS NULL OR YEAR(t.date) = :year)
          AND (:type IS NULL OR t.type = :type)
          AND (:categoryId IS NULL OR t.category.id = :categoryId)
        ORDER BY t.date DESC, t.createdAt DESC
        """)
    Page<Transaction> findByFilters(
        @Param("user") User user,
        @Param("month") Integer month,
        @Param("year") Integer year,
        @Param("type") TransactionType type,
        @Param("categoryId") UUID categoryId,
        Pageable pageable
    );

    @Query("""
        SELECT t FROM Transaction t
        WHERE t.user = :user
          AND MONTH(t.date) = :month
          AND YEAR(t.date) = :year
        """)
    List<Transaction> findByUserAndMonthAndYear(
        @Param("user") User user,
        @Param("month") int month,
        @Param("year") int year
    );

    @Query("""
        SELECT COALESCE(SUM(t.amount), 0)
        FROM Transaction t
        WHERE t.user = :user
          AND t.type = :type
          AND MONTH(t.date) = :month
          AND YEAR(t.date) = :year
        """)
    BigDecimal sumByUserAndTypeAndMonthAndYear(
        @Param("user") User user,
        @Param("type") TransactionType type,
        @Param("month") int month,
        @Param("year") int year
    );
}
