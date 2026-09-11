-- Seed data for Loket PTSP Kemenag Barito Utara
-- Run AFTER schema.sql

INSERT INTO kemenag_loket.categories (code, name, description, display_order)
VALUES
    ('A', 'Pelayanan Umum', 'Administrasi umum dan informasi', 1),
    ('B', 'Kepegawaian', 'Layanan kepegawaian ASN', 2),
    ('C', 'Pendidikan Islam', 'Layanan madrasah dan pendidikan islam', 3),
    ('D', 'Haji & Umrah', 'Layanan haji dan umrah', 4)
ON CONFLICT (code) DO NOTHING;

-- Default admin: username "admin", password "admin123"
-- Hash generated with bcrypt (cost 10): replace if needed
INSERT INTO kemenag_loket.users (username, password_hash, name, role)
VALUES (
    'admin',
    '$2a$10$cXPOzuJX6wd120BlvAduMed2VYM.HvpHfxUEM5NJd6EaYZuDAXua.',
    'Administrator',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Super Admin Pusdatin Kemenag Barito Utara (password: @Kemenag_126)
INSERT INTO kemenag_loket.users (id, username, password_hash, name, role)
VALUES (
    '847ec58d-d66a-4e41-9343-da9f85a276b8',
    'baritoutara@kemenag.go.id',
    '$2a$06$nGQROM57bZmViWabdaRvBuZjzZBH502E3rKeIUqxReH2BOAGK48/a',
    'ADMIN KABUPATEN',
    'admin'
)
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    role = EXCLUDED.role;