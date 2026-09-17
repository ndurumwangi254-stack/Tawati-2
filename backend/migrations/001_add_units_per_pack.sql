-- Adds pack-to-unit conversion support to existing medicines.
-- Safe to run on a database that already has data — existing rows get
-- units_per_pack = 1 (no conversion, same behavior as before).

ALTER TABLE medicines
    ADD COLUMN units_per_pack INTEGER NOT NULL DEFAULT 1 CHECK (units_per_pack >= 1);
