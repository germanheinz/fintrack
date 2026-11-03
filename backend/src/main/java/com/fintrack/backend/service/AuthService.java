package com.fintrack.backend.service;

import com.fintrack.backend.domain.Category;
import com.fintrack.backend.domain.ItemCategory;
import com.fintrack.backend.domain.User;
import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.LoginRequest;
import com.fintrack.backend.dto.RegisterRequest;
import com.fintrack.backend.exception.EmailAlreadyInUseException;
import com.fintrack.backend.exception.InvalidCredentialsException;
import com.fintrack.backend.repository.CategoryRepository;
import com.fintrack.backend.repository.ItemCategoryRepository;
import com.fintrack.backend.repository.UserRepository;
import com.fintrack.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ItemCategoryRepository itemCategoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            CategoryRepository categoryRepository,
            ItemCategoryRepository itemCategoryRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.itemCategoryRepository = itemCategoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyInUseException(request.email());
        }

        User user = User.builder()
                .name(request.name())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
        user = userRepository.save(user);

        seedDefaultCategories(user.getId());
        seedDefaultItemCategories(user.getId());

        String token = jwtService.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = jwtService.generateToken(user.getId());
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail());
    }

    private void seedDefaultCategories(java.util.UUID userId) {
        DefaultCategories.ALL.forEach(seed -> categoryRepository.save(
                Category.builder()
                        .userId(userId)
                        .name(seed.name())
                        .icon(seed.icon())
                        .color(seed.color())
                        .type(seed.type())
                        .isDefault(true)
                        .build()
        ));
    }

    private void seedDefaultItemCategories(java.util.UUID userId) {
        DefaultItemCategories.NAMES.forEach(name -> itemCategoryRepository.save(
                ItemCategory.builder()
                        .userId(userId)
                        .name(name)
                        .isDefault(true)
                        .build()
        ));
    }
}
