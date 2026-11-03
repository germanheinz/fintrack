package com.fintrack.backend.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Única forma permitida de leer "quién es el usuario autenticado" en los controllers/services. */
@Component
public class CurrentUserProvider {

    public UUID getUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return (UUID) principal;
    }
}
