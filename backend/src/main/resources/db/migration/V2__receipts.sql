CREATE TABLE item_categories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_item_categories_user_name UNIQUE (user_id, name)
);

CREATE TABLE canonical_products (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_category_id UUID NOT NULL REFERENCES item_categories(id),
    name VARCHAR(255) NOT NULL,
    base_unit VARCHAR(8) NOT NULL CHECK (base_unit IN ('KG', 'L', 'UNIT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_canonical_products_user_name UNIQUE (user_id, name)
);

-- One receipt per transaction. The merchant name is stored in transactions.description.
CREATE TABLE receipts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    status VARCHAR(24) NOT NULL
        CHECK (status IN ('SUBMITTED', 'CATEGORIZING', 'CATEGORIZED', 'NEEDS_REVIEW', 'CONFIRMED')),
    idempotency_key VARCHAR(100) NOT NULL,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_receipts_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE TABLE receipt_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    raw_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 3),
    line_total NUMERIC(14, 2) NOT NULL,
    item_category_id UUID REFERENCES item_categories(id),
    canonical_product_id UUID REFERENCES canonical_products(id),
    unit_price_normalized NUMERIC(14, 4),
    confidence NUMERIC(4, 3),
    user_corrected BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_receipt_items_receipt ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_user_category ON receipt_items(user_id, item_category_id);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(32) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox_events(next_attempt_at) WHERE status = 'PENDING';

-- Default item categories for users that already exist. Keep in sync with DefaultItemCategories.java.
INSERT INTO item_categories (id, user_id, name, is_default)
SELECT gen_random_uuid(), u.id, c.name, TRUE
FROM users u
CROSS JOIN (VALUES
    ('Frutas y verduras'),
    ('Carnes y pescado'),
    ('Lácteos'),
    ('Huevos'),
    ('Panadería y repostería'),
    ('Despensa'),
    ('Congelados y platos preparados'),
    ('Bebidas sin alcohol'),
    ('Bebidas alcohólicas'),
    ('Snacks y dulces'),
    ('Limpieza del hogar'),
    ('Higiene y cuidado personal'),
    ('Mascotas'),
    ('Hogar y otros no alimentarios'),
    ('Otros')
) AS c(name);
