# ==============================================================================
# Multi-Stage Dockerfile for Loket PTSP Kemenag Barito Utara
# Stage 1: Build Frontend (Astro SSG + Tailwind + React)
# Stage 2: Build Backend (Go Fiber v3)
# Stage 3: Runtime with Infisical CLI (Universal Auth)
# ==============================================================================

# --- Stage 1: Frontend Build ---
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app

# Install dependencies with Linux platform bindings
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install

# Copy frontend source and build Astro static site
COPY frontend/ ./frontend/
WORKDIR /app/frontend
ARG PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADR1O_LSp1lgc3km
ENV PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

# --- Stage 2: Backend Build ---
FROM golang:alpine AS backend-builder
WORKDIR /app/backend
ENV GOTOOLCHAIN=auto
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# --- Stage 3: Production Runner with Infisical CLI ---
FROM alpine:3.21 AS runner
WORKDIR /app

# Install system dependencies & Infisical CLI
RUN apk add --no-cache ca-certificates tzdata curl bash \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

# Set timezone to Asia/Jakarta (WIB)
ENV TZ=Asia/Jakarta
RUN cp /usr/share/zoneinfo/Asia/Jakarta /etc/localtime && echo "Asia/Jakarta" > /etc/timezone

# Copy compiled Go server & built frontend static assets
COPY --from=backend-builder /app/server /app/server
COPY --from=frontend-builder /app/frontend/dist /app/dist
ENV STATIC_DIR=/app/dist
ENV PORT=8080

# Setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/app/server"]
