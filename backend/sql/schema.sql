-- Schema for Loket PTSP Kemenag Barito Utara
-- Run against Supabase PostgreSQL

CREATE SCHEMA IF NOT EXISTS kemenag_loket;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS kemenag_loket.users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username      text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    name          text NOT NULL,
    role          text NOT NULL DEFAULT 'admin',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kemenag_loket.categories (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code          text NOT NULL UNIQUE,
    name          text NOT NULL,
    description   text NOT NULL DEFAULT '',
    display_order int NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kemenag_loket.queues (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   uuid NOT NULL REFERENCES kemenag_loket.categories(id),
    ticket_number int NOT NULL,
    status        text NOT NULL DEFAULT 'waiting',
    source        text NOT NULL DEFAULT 'kiosk',
    called_at     timestamptz,
    completed_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT queues_status_check CHECK (status IN ('waiting', 'called', 'completed', 'skipped')),
    CONSTRAINT queues_source_check CHECK (source IN ('kiosk', 'admin')),
    UNIQUE (category_id, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_queues_status ON kemenag_loket.queues (status);
CREATE INDEX IF NOT EXISTS idx_queues_created_at ON kemenag_loket.queues (created_at);
CREATE INDEX IF NOT EXISTS idx_queues_category_id ON kemenag_loket.queues (category_id);

CREATE OR REPLACE FUNCTION kemenag_loket.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON kemenag_loket.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON kemenag_loket.users
    FOR EACH ROW EXECUTE FUNCTION kemenag_loket.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON kemenag_loket.categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON kemenag_loket.categories
    FOR EACH ROW EXECUTE FUNCTION kemenag_loket.set_updated_at();

CREATE TABLE IF NOT EXISTS kemenag_loket.tv_settings (
    id              text PRIMARY KEY DEFAULT 'default',
    playback_mode   text NOT NULL DEFAULT 'playlist',
    single_mode     text NOT NULL DEFAULT 'info',
    video_id        text NOT NULL DEFAULT '',
    running_text    text NOT NULL DEFAULT '',
    custom_maklumat text NOT NULL DEFAULT '',
    office_address  text NOT NULL DEFAULT '',
    playlist        jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_queues_updated_at ON kemenag_loket.queues;
CREATE TRIGGER trg_queues_updated_at
    BEFORE UPDATE ON kemenag_loket.queues
    FOR EACH ROW EXECUTE FUNCTION kemenag_loket.set_updated_at();

DROP TRIGGER IF EXISTS trg_tv_settings_updated_at ON kemenag_loket.tv_settings;
CREATE TRIGGER trg_tv_settings_updated_at
    BEFORE UPDATE ON kemenag_loket.tv_settings
    FOR EACH ROW EXECUTE FUNCTION kemenag_loket.set_updated_at();