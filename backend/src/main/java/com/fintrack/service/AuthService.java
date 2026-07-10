package com.fintrack.service;

import com.fintrack.dto.AuthRequest;
import com.fintrack.dto.AuthResponse;
import com.fintrack.dto.RegisterRequest;
import com.fintrack.entity.Category;
import com.fintrack.entity.TransactionType;
import com.fintrack.entity.User;
import com.fintrack.repository.CategoryRepository;
import com.fintrack.repository.UserRepository;
import com.fintrack.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already in use: " + request.email());
        }

        User user = User.builder()
            .name(request.name())
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            .build();

        user = userRepository.save(user);
        createDefaultCategories(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getName());
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getName());
    }

    private void createDefaultCategories(User user) {
        List<Category> defaults = List.of(
            // Income
            buildCategory("Salary",        "💼", "#4CAF50", TransactionType.INCOME, user),
            buildCategory("Freelance",     "💻", "#2196F3", TransactionType.INCOME, user),
            buildCategory("Investments",   "📈", "#9C27B0", TransactionType.INCOME, user),
            buildCategory("Side Income",   "🤝", "#00BCD4", TransactionType.INCOME, user),
            buildCategory("Other Income",  "💰", "#8BC34A", TransactionType.INCOME, user),
            // Expense
            buildCategory("Rent / Mortgage", "🏠", "#3F51B5", TransactionType.EXPENSE, user),
            buildCategory("Groceries",       "🛒", "#F44336", TransactionType.EXPENSE, user),
            buildCategory("Restaurants",     "🍽️", "#FF5722", TransactionType.EXPENSE, user),
            buildCategory("Transport",       "🚗", "#FF9800", TransactionType.EXPENSE, user),
            buildCategory("Fuel",            "⛽", "#FFC107", TransactionType.EXPENSE, user),
            buildCategory("Utilities",       "💡", "#607D8B", TransactionType.EXPENSE, user),
            buildCategory("Subscriptions",   "📱", "#9C27B0", TransactionType.EXPENSE, user),
            buildCategory("Health",          "🏥", "#00BCD4", TransactionType.EXPENSE, user),
            buildCategory("Pharmacy",        "💊", "#E91E63", TransactionType.EXPENSE, user),
            buildCategory("Clothing",        "👕", "#795548", TransactionType.EXPENSE, user),
            buildCategory("Entertainment",   "🎬", "#E91E63", TransactionType.EXPENSE, user),
            buildCategory("Travel",          "✈️", "#03A9F4", TransactionType.EXPENSE, user),
            buildCategory("Education",       "📚", "#673AB7", TransactionType.EXPENSE, user),
            buildCategory("Other",           "📦", "#9E9E9E", TransactionType.EXPENSE, user)
        );

        categoryRepository.saveAll(defaults);
    }

    private Category buildCategory(String name, String icon, String color, TransactionType type, User user) {
        return Category.builder()
            .name(name)
            .icon(icon)
            .color(color)
            .type(type)
            .user(user)
            .isDefault(true)
            .build();
    }
}
