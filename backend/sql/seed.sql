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