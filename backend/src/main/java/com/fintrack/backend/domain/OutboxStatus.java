package com.fintrack.backend.domain;

public enum OutboxStatus {
    PENDING,
    PROCESSING,
    DONE,
    FAILED
}
