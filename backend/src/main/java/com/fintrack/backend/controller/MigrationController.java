package com.fintrack.backend.controller;

import com.fintrack.backend.dto.BackupImportRequest;
import com.fintrack.backend.dto.MigrationResult;
import com.fintrack.backend.security.CurrentUserProvider;
import com.fintrack.backend.service.MigrationService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    private final MigrationService migrationService;
    private final CurrentUserProvider currentUser;

    public MigrationController(MigrationService migrationService, CurrentUserProvider currentUser) {
        this.migrationService = migrationService;
        this.currentUser = currentUser;
    }

    /** Recibe el mismo JSON que ya genera el botón "Export" de SettingsScreen. */
    @PostMapping("/import-backup")
    public MigrationResult importBackup(@RequestBody BackupImportRequest backup) {
        return migrationService.importBackup(currentUser.getUserId(), backup);
    }
}
