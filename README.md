# Loket PTSP Kemenag Barito Utara

Sistem antrian digital untuk Pelayanan Terpadu Satu Pintu (PTSP) Kantor Kementerian Agama Kabupaten Barito Utara.

## Architecture

| Layer | Tech | Dir |
|-------|------|-----|
| Frontend | Astro 7 + React 19 + Tailwind 4 | `frontend/` |
| Backend | Go Fiber v3.5 | `backend/` |
| Database | PocketBase (Primary Database) | `https://db-loket.kemenag-baritoutara.com` |
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

Database setup & verifikasi data (idempotent — cek & auto-seed data default ke PocketBase):

```bash
npm run seed  # atau: cd backend && go run ./cmd/seed
```

## Database

Sistem database dikelola terpusat di **PocketBase** (`https://db-loket.kemenag-baritoutara.com`).
Seluruh skema koleksi (`categories`, `queues`, `tv_settings`, dan `users`) telah aktif dan terkelola secara native di PocketBase. Runner `cmd/seed` berinteraksi langsung melalui REST API PocketBase secara aman menggunakan kredensial superuser yang diinjeksi dari Infisical Cloud.

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
| `POCKETBASE_URL` | URL PocketBase (`https://db-loket.kemenag-baritoutara.com`) |
| `POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD` | Kredensial Superuser PocketBase |
| `PORT` / `APP_ENV` / `CORS_ORIGINS` | Server fiber, mode, origin browser yang dibolehkan (`http://localhost:3000` di dev) |
| `JWT_SECRET` / `JWT_TTL_HOURS` | Auth signing secret + token lifetime |
| `TURNSTILE_SECRET_KEY` / `TURNSTILE_SITE_KEY` | Cloudflare Turnstile (secret kosong = skip captcha, lokal) |
| `PUBLIC_API_URL` / `PUBLIC_WS_URL` | **Kosong = same-origin** (dev: diproksi Astro `:3000`; prod: reverse proxy). Isi hanya bila backend di host/port terpisah |
| `PUBLIC_TURNSTILE_SITE_KEY` | Site key untuk Turnstile di frontend |
| `SATELLITE_URL` / `SATELLITE_APP_SLUG` / `PUSDATIN_FALLBACK_MS` | Pusdatin satellite URL + slug maintenance check + timeout fallback |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 credentials untuk penyimpanan media TV Display |
| `R2_BUCKET` / `R2_PUBLIC_URL` | Nama bucket R2 dan domain publik media assets (opsional) |
| `SITE_URL` | URL publik situs |

## Deployment

- **URL**: `loket.kemenag-baritoutara.com`
- **Output**: `output: 'static'` (Astro SSG) + Go backend
- **CI/CD**: GitHub Actions → Coolify
- **Before go-live**: ensure the Pusdatin `satellite_apps` row for `loket_ptsp_kemenag` is `status='online'`. While it is `maintenance`, `GET /api/v1/pusdatin/maintenance` returns `maintenance:true` and the frontend shows the maintenance blocker.
