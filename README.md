# Loket PTSP Kemenag Barito Utara

Sistem antrian digital untuk Pelayanan Terpadu Satu Pintu (PTSP) Kantor Kementerian Agama Kabupaten Barito Utara.

## Architecture

| Layer | Tech | Dir |
|-------|------|-----|
| Frontend | Astro 7 + React 19 + Tailwind 4 | `frontend/` |
| Backend | Go Fiber v3.5 + pgx + sqlx | `backend/` |
| Database | PostgreSQL 16 (Supabase) | schema: `kemenag_loket` |
| Realtime | WebSocket (Fiber) | `/api/v1/ws/queue` |

## Quick Start

Satu perintah dari repo root menyalakan backend (Go Fiber, hot-reload via AIR) dan frontend (Astro) sekaligus. Frontend berjalan di **:3000** dan mem-proxy `/api/v1` (termasuk WebSocket) ke backend **:8080** — browser cukup memakai satu port.

```bash
# Prerequisites
# - Go 1.24+ (air: go install github.com/air-verse/air@latest)
# - Node.js 22+

# Env terpusat di Infisical Cloud (Zero Local .env):
# Seluruh rahasia & konfigurasi ditarik otomatis dari Infisical Cloud (/loket-kemenag)

npm install            # root: workspaces (frontend) + concurrently + cross-env
npm run dev:infisical  # => FE http://localhost:3000 + BE :8080 (injeksi env Infisical Cloud)
```

Opsional, jalankan terpisah:

```bash
npm run dev:fe         # Astro dev hanya (fetch/proxy tetap mengarah ke :8080)
npm run dev:be         # backend + AIR hot reload hanya
```

Database setup (sekali / idempotent — migrasi legacy schema + apply schema + seed):

```bash
cd backend && go run ./cmd/seed
```

## Database

| File | Purpose |
|------|---------|
| `backend/sql/migration_legacy.sql` | One-time in-place migration from the legacy Next.js/Drizzle schema (int ids, `password` column) to the new schema (uuid ids, `password_hash`), preserving users & categories |
| `backend/sql/schema.sql` | Target schema (idempotent, `IF NOT EXISTS`) |
| `backend/sql/seed.sql` | Seed user + categories (`ON CONFLICT`, preserves existing data) |

Run all three with `go run ./cmd/seed`. It is safe to run repeatedly.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with live stats |
| `/kiosk` | Self-service ticket kiosk |
| `/display` | TV display with TTS announcements |
| `/track` | Ticket tracking (`?id=<uuid>` from kiosk; also lookup by code+number) |
| `/admin` | Admin dashboard (call/recall/adjust) |
| `/login` | Admin login (Turnstile + JWT) |

## Configuration & Secrets (Infisical Cloud)
 
Seluruh rahasia dan konfigurasi lingkungan (`dev` & `prod`) dikelola terpusat di **Infisical Cloud** pada path `/loket-kemenag`. File `.env` lokal dan `.env.example` sudah tidak digunakan (Zero Local Env Files). Saat onboarding atau deployment, kredensial diinjeksi langsung dari Infisical Cloud ke proses runtime.

| Var | Description |
|-----|-------------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL DSN (schema `kemenag_loket`) |
| `PORT` / `APP_ENV` / `CORS_ORIGINS` | Server fiber, mode, origin browser yang dibolehkan (`http://localhost:3000` di dev) |
| `JWT_SECRET` / `JWT_TTL_HOURS` | Auth signing secret + token lifetime |
| `TURNSTILE_SECRET_KEY` / `TURNSTILE_SITE_KEY` | Cloudflare Turnstile (secret kosong = skip captcha, lokal) |
| `PUBLIC_API_URL` / `PUBLIC_WS_URL` | **Kosong = same-origin** (dev: diproksi Astro `:3000`; prod: reverse proxy). Isi hanya bila backend di host/port terpisah |
| `PUBLIC_TURNSTILE_SITE_KEY` | Site key untuk Turnstile di frontend |
| `SATELLITE_URL` / `SATELLITE_APP_SLUG` / `PUSDAIN_FALLBACK_MS` | Pusdatin satellite URL + slug maintenance check + timeout fallback |
| `SITE_URL` | URL publik situs |
| `NEXT_PUBLIC_*` / `SUPABASE_SERVICE_ROLE_KEY` | Legacy (autentikasi Next.js lama) — dipertahankan, tidak dipakai Go stack |

## Deployment

- **URL**: `loket.kemenag-baritoutara.com`
- **Output**: `output: 'static'` (Astro SSG) + Go backend
- **CI/CD**: GitHub Actions → Coolify
- **Before go-live**: ensure the Pusdatin `satellite_apps` row for `loket_ptsp_kemenag` is `status='online'`. While it is `maintenance`, `GET /api/v1/pusdatin/maintenance` returns `maintenance:true` and the frontend shows the maintenance blocker.
