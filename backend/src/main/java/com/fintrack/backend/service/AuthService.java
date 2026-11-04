package com.fintrack.backend.service;

import com.fintrack.backend.domain.User;
import com.fintrack.backend.dto.AuthResponse;
import com.fintrack.backend.dto.LoginRequest;
import com.fintrack.backend.dto.RegisterRequest;
import com.fintrack.backend.exception.EmailAlreadyInUseException;
import com.fintrack.backend.exception.InvalidCredentialsException;
import com.fintrack.backend.repository.UserRepository;
import com.fintrack.backend.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CategoryService categoryService;
    private final ItemCategoryService itemCategoryService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            CategoryService categoryService,
            ItemCategoryService itemCategoryService,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.categoryService = categoryService;
        this.itemCategoryService = itemCategoryService;
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

        categoryService.seedDefaults(user.getId());
        itemCategoryService.seedDefaults(user.getId());

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
}
