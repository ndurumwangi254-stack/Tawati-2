-- Tawati Chemist — database schema
-- PostgreSQL. Single-shop (no branch_id anywhere by design).

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    username        VARCHAR(60) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'worker')),
    status          VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shop_settings (
    id      SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single row, single shop
    name    VARCHAR(150) NOT NULL DEFAULT 'Tawati Chemist',
    phone   VARCHAR(30),
    address VARCHAR(255)
);
INSERT INTO shop_settings (id, name) VALUES (1, 'Tawati Chemist') ON CONFLICT DO NOTHING;

CREATE TABLE categories (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(120),
    phone           VARCHAR(30),
    address         VARCHAR(255)
);

CREATE TABLE medicines (
    id              SERIAL PRIMARY KEY,
    brand_name      VARCHAR(150) NOT NULL,
    generic_name    VARCHAR(150) NOT NULL,
    manufacturer    VARCHAR(150),
    category_id     INTEGER REFERENCES categories(id),
    unit            VARCHAR(30) NOT NULL,          -- e.g. tablet, bottle, sachet (the DISPENSE unit)
    units_per_pack  INTEGER NOT NULL DEFAULT 1 CHECK (units_per_pack >= 1),
                                                    -- e.g. 100 if bought as a box of 100 tablets but
                                                    -- dispensed one tablet at a time. Stock, reorder
                                                    -- level, and selling_price are always in dispense
                                                    -- units (see medicines.units_per_pack notes below);
                                                    -- this column only drives the pack->unit conversion
                                                    -- on the Add Medicine / Restock forms.
    selling_price   NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicines_generic_name ON medicines (generic_name);
CREATE INDEX idx_medicines_brand_name ON medicines (brand_name);

CREATE TABLE batches (
    id                  SERIAL PRIMARY KEY,
    medicine_id         INTEGER NOT NULL REFERENCES medicines(id),
    supplier_id         INTEGER REFERENCES suppliers(id),
    batch_number        VARCHAR(80),
    quantity_received   INTEGER NOT NULL CHECK (quantity_received >= 0),
    quantity_remaining  INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    cost_price          NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
    expiry_date         DATE NOT NULL,
    received_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by         INTEGER REFERENCES users(id)
);

CREATE INDEX idx_batches_medicine_id ON batches (medicine_id);
CREATE INDEX idx_batches_expiry_date ON batches (expiry_date);

CREATE TABLE patients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(30),
    is_chronic  BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT
);

CREATE TABLE patient_medicines (
    id                     SERIAL PRIMARY KEY,
    patient_id             INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    generic_name           VARCHAR(150) NOT NULL,
    typical_interval_days  INTEGER,
    last_purchased_at      DATE,
    UNIQUE (patient_id, generic_name)
);

CREATE TABLE sales (
    id              SERIAL PRIMARY KEY,
    sold_by         INTEGER NOT NULL REFERENCES users(id),
    patient_id      INTEGER REFERENCES patients(id),      -- nullable: most sales won't have one
    total_amount    NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_cost      NUMERIC(10, 2) NOT NULL DEFAULT 0,      -- for margin reporting
    payment_method  VARCHAR(10) NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_created_at ON sales (created_at);
CREATE INDEX idx_sales_patient_id ON sales (patient_id);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(80),
    unit            VARCHAR(30) NOT NULL,          -- e.g. piece, bottle
    units_per_pack  INTEGER NOT NULL DEFAULT 1 CHECK (units_per_pack >= 1),
    cost_price      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price   NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Deliberately simpler than medicines: no batches, no expiry, no FEFO.
-- Stock is a single number updated directly, for non-medicine shop items
-- (toothpaste, bottled water, etc.) where that level of tracking isn't needed.

CREATE TABLE sale_items (
    id           SERIAL PRIMARY KEY,
    sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id  INTEGER REFERENCES medicines(id),      -- set for a medicine line
    batch_id     INTEGER REFERENCES batches(id),         -- set for a medicine line (FEFO batch)
    product_id   INTEGER REFERENCES products(id),        -- set for a shop-item line
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(10, 2) NOT NULL,   -- snapshot of the selling price at sale time
    unit_cost    NUMERIC(10, 2) NOT NULL,   -- snapshot of the cost at sale time
    subtotal     NUMERIC(10, 2) NOT NULL,
    CONSTRAINT sale_items_line_type_check CHECK (
        (medicine_id IS NOT NULL AND batch_id IS NOT NULL AND product_id IS NULL)
        OR
        (product_id IS NOT NULL AND medicine_id IS NULL AND batch_id IS NULL)
    )
);

CREATE INDEX idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX idx_sale_items_medicine_id ON sale_items (medicine_id);

CREATE TABLE stock_movements (
    id            SERIAL PRIMARY KEY,
    medicine_id   INTEGER REFERENCES medicines(id),
    batch_id      INTEGER REFERENCES batches(id),
    product_id    INTEGER REFERENCES products(id),
    type          VARCHAR(12) NOT NULL CHECK (type IN ('received', 'sold', 'expired', 'damaged', 'adjustment')),
    quantity      INTEGER NOT NULL,   -- positive for received, negative for sold/expired/damaged/adjustment-down
    performed_by  INTEGER REFERENCES users(id),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stock_movements_line_type_check CHECK (
        (medicine_id IS NOT NULL AND product_id IS NULL)
        OR
        (product_id IS NOT NULL AND medicine_id IS NULL)
    )
);

CREATE INDEX idx_stock_movements_medicine_id ON stock_movements (medicine_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at);

-- Notes for whoever builds the backend:
--
-- 1. Low stock / expiring-soon / out-of-stock are COMPUTED, not stored:
--      low stock:    SUM(batches.quantity_remaining) for a medicine <= medicines.reorder_level
--      expiring soon: batches.expiry_date BETWEEN now() AND now() + interval '60 days'
--      out of stock:  SUM(batches.quantity_remaining) for a medicine = 0
--
-- 2. FEFO dispensing: when a sale is made, pick the batch with the
--    soonest expiry_date that still has quantity_remaining > 0 for that medicine.
--
-- 3. Every stock change (sale, delivery, correction) must insert a
--    stock_movements row — never update a running total in place without
--    leaving a record behind.
--
-- 4. sale_items.unit_price / unit_cost are snapshots on purpose: if
--    medicines.selling_price changes later, historical sales/reports must
--    stay accurate to what was actually charged.
--
-- 5. Refill-due for a chronic patient = today - patient_medicines.last_purchased_at
--    >= patient_medicines.typical_interval_days. Update last_purchased_at
--    whenever ANY brand of that generic_name is sold to that patient.

-- Shop items: non-medicine retail products (toothpaste, bottled water, etc.)
-- Deliberately simpler than medicines — a single stock_quantity, no batches,
-- no expiry tracking. Sold through the same Dispense cart as medicines
-- (see sale_items below), but nothing else about medicines applies here:
-- no FEFO, no generic-name grouping, no Rx concerns.
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(100),
    unit            VARCHAR(30) NOT NULL DEFAULT 'piece',
    units_per_pack  INTEGER NOT NULL DEFAULT 1 CHECK (units_per_pack >= 1),
    cost_price      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price   NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
