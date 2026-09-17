-- Adds non-medicine "shop items" (toothpaste, bottled water, etc.) as a
-- simpler, batch-free product type that can be sold alongside medicines
-- in the same sale.

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    category        VARCHAR(80),
    unit            VARCHAR(30) NOT NULL,
    units_per_pack  INTEGER NOT NULL DEFAULT 1 CHECK (units_per_pack >= 1),
    cost_price      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    selling_price   NUMERIC(10, 2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reorder_level   INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sale_items becomes polymorphic: a line is either a medicine (existing
-- batch/FEFO behavior, unchanged) OR a product (simple stock decrement,
-- no batch). Exactly one of the two must be set.
ALTER TABLE sale_items ALTER COLUMN medicine_id DROP NOT NULL;
ALTER TABLE sale_items ALTER COLUMN batch_id DROP NOT NULL;
ALTER TABLE sale_items ADD COLUMN product_id INTEGER REFERENCES products(id);
ALTER TABLE sale_items ADD CONSTRAINT sale_items_medicine_or_product CHECK (
    (medicine_id IS NOT NULL AND batch_id IS NOT NULL AND product_id IS NULL) OR
    (medicine_id IS NULL AND batch_id IS NULL AND product_id IS NOT NULL)
);

-- Same polymorphism for the audit trail, so product restocks/sales still
-- get logged exactly like medicine ones do.
ALTER TABLE stock_movements ALTER COLUMN medicine_id DROP NOT NULL;
ALTER TABLE stock_movements ADD COLUMN product_id INTEGER REFERENCES products(id);
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_medicine_or_product CHECK (
    (medicine_id IS NOT NULL AND product_id IS NULL) OR
    (medicine_id IS NULL AND product_id IS NOT NULL)
);
