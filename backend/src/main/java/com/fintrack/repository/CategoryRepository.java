package com.fintrack.repository;

import com.fintrack.entity.Category;
import com.fintrack.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByUserOrderByTypeAscNameAsc(User user);

    Optional<Category> findByIdAndUser(UUID id, User user);
}
