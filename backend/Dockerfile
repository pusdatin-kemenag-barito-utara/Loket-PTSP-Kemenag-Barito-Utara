# Build stage
FROM golang:1.27-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/server ./cmd/server

# Runtime stage
FROM alpine:3.21

RUN adduser -D -u 1001 appuser
USER appuser

WORKDIR /app
COPY --from=builder /app/bin/server /app/server

EXPOSE 8080

ENV PORT=8080

ENTRYPOINT ["/app/server"]