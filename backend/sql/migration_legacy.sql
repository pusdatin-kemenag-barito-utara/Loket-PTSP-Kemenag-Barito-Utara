-- Migration: kemenag_loket legacy (Next.js / Drizzle) -> new (Go backend) schema
-- One-time migration. Preserves existing data:
--   * users: keeps username, password_hash (from password), name, role, created_at
--   * categories: keeps live codes/names, adds the new columns
--   * queues: dropped and recreated (empty in legacy; see schema.sql)
-- Run via: go run ./cmd/seed  (loads DATABASE_URL from env)

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===================================================================
-- users
-- ===================================================================
ALTER TABLE kemenag_loket.users ADD COLUMN IF NOT EXISTS password_hash text;
UPDATE kemenag_loket.users SET password_hash = password WHERE password_hash IS NULL;

ALTER TABLE kemenag_loket.users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE kemenag_loket.users SET updated_at = created_at WHERE updated_at = created_at IS NOT TRUE AND updated_at IS NULL;

ALTER TABLE kemenag_loket.users ADD COLUMN nid uuid;
UPDATE kemenag_loket.users SET nid = gen_random_uuid();
ALTER TABLE kemenag_loket.users ALTER COLUMN nid SET NOT NULL;

ALTER TABLE kemenag_loket.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE kemenag_loket.users DROP COLUMN id;
ALTER TABLE kemenag_loket.users RENAME COLUMN nid TO id;
ALTER TABLE kemenag_loket.users ADD PRIMARY KEY (id);
ALTER TABLE kemenag_loket.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE kemenag_loket.users DROP COLUMN IF EXISTS password;
UPDATE kemenag_loket.users SET role = lower(role);
UPDATE kemenag_loket.users SET role = 'admin' WHERE role = '' OR role IS NULL;

DROP SEQUENCE IF EXISTS kemenag_loket.users_id_seq;

-- ===================================================================
-- queues: drop (empty in legacy) and let schema.sql recreate it
-- ===================================================================
DROP TABLE IF EXISTS kemenag_loket.queues;
DROP SEQUENCE IF EXISTS kemenag_loket.queues_id_seq;

-- ===================================================================
-- categories
-- ===================================================================
ALTER TABLE kemenag_loket.categories ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE kemenag_loket.categories ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;
ALTER TABLE kemenag_loket.categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE kemenag_loket.categories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE kemenag_loket.categories ADD COLUMN nid uuid;
UPDATE kemenag_loket.categories SET nid = gen_random_uuid();
ALTER TABLE kemenag_loket.categories ALTER COLUMN nid SET NOT NULL;

ALTER TABLE kemenag_loket.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE kemenag_loket.categories DROP COLUMN id;
ALTER TABLE kemenag_loket.categories RENAME COLUMN nid TO id;
ALTER TABLE kemenag_loket.categories ADD PRIMARY KEY (id);
ALTER TABLE kemenag_loket.categories ALTER COLUMN id SET DEFAULT gen_random_uuid();

DROP SEQUENCE IF EXISTS kemenag_loket.categories_id_seq;

-- Fill description + order for the live deployed categories (by code).
UPDATE kemenag_loket.categories SET
    description = CASE code
        WHEN 'A' THEN 'Layanan Penyelenggaraan Haji & Umrah'
        WHEN 'B' THEN 'Layanan Bimas Islam & Zakat/Wakaf'
        WHEN 'C' THEN 'Layanan Pendidikan Islam (Madrasah)'
        WHEN 'D' THEN 'Layanan Umum / PTSP'
        ELSE description
    END,
    display_order = CASE code
        WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4
        ELSE display_order
    END;

COMMIT;