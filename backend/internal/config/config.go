package config

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Server struct {
		Port    string
		Env     string
		Origins string
	}
	PocketBase struct {
		URL           string
		AdminEmail    string
		AdminPassword string
	}
	JWT struct {
		Secret string
		TTL    time.Duration
	}
	Turnstile struct {
		SecretKey string
		SiteKey   string
	}
	Pusdatin struct {
		SatelliteURL  string
		SatelliteSlug string
		FallbackMS    int
	}
	R2 struct {
		AccountID       string
		EndpointURL     string
		AccessKeyID     string
		SecretAccessKey string
		Bucket          string
		PublicURL       string
	}
}

// LoadEnv loads environment variables from .env files if not already set in OS environment.
func LoadEnv(filenames ...string) {
	if len(filenames) == 0 {
		filenames = []string{".env", ".env.local", "../.env", "../.env.local", "../../.env"}
	}

	for _, filename := range filenames {
		loadFile(filename)
	}
}

func loadFile(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		// Strip surrounding single or double quotes
		if len(val) >= 2 {
			if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
				val = val[1 : len(val)-1]
			}
		}

		// Only set if not already set in OS environment
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}

	if err := scanner.Err(); err != nil {
		_ = err
	}
}

func Load() *Config {
	LoadEnv()

	cfg := &Config{}

	cfg.Server.Port = getEnv("PORT", "3000")
	cfg.Server.Env = getEnv("APP_ENV", "development")
	cfg.Server.Origins = getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:4321")

	cfg.PocketBase.URL = getEnvFirst([]string{"POCKETBASE_URL", "PB_URL"}, "")
	cfg.PocketBase.AdminEmail = getEnvFirst([]string{"POCKETBASE_ADMIN_EMAIL", "PB_ADMIN_EMAIL", "POCKETBASE_SUPERUSER_EMAIL"}, "")
	cfg.PocketBase.AdminPassword = getEnvFirst([]string{"POCKETBASE_ADMIN_PASSWORD", "PB_ADMIN_PASSWORD", "POCKETBASE_SUPERUSER_PASSWORD"}, "")

	cfg.JWT.Secret = getEnv("JWT_SECRET", "")
	if cfg.JWT.Secret == "" && !cfg.IsProduction() {
		cfg.JWT.Secret = "dev-secret-loket-kemenag-barito-utara-do-not-use-in-production"
	}
	cfg.JWT.TTL = time.Duration(getEnvInt("JWT_TTL_HOURS", 24)) * time.Hour

	cfg.Turnstile.SecretKey = getEnv("TURNSTILE_SECRET_KEY", "")
	cfg.Turnstile.SiteKey = getEnvFirst([]string{"TURNSTILE_SITE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "PUBLIC_TURNSTILE_SITE_KEY"}, "")

	cfg.Pusdatin.SatelliteURL = getEnvFirst([]string{"SATELLITE_URL", "NEXT_PUBLIC_PUSDATIN_URL"}, "")
	cfg.Pusdatin.SatelliteSlug = getEnv("SATELLITE_APP_SLUG", "")
	cfg.Pusdatin.FallbackMS = getEnvIntFirst([]string{"PUSDATIN_FALLBACK_MS", "PUSDAIN_FALLBACK_MS"}, 3000)

	cfg.R2.AccountID = getEnv("R2_ACCOUNT_ID", "")
	cfg.R2.EndpointURL = getEnv("R2_ENDPOINT_URL", "")
	cfg.R2.AccessKeyID = getEnv("R2_ACCESS_KEY_ID", "")
	cfg.R2.SecretAccessKey = getEnv("R2_SECRET_ACCESS_KEY", "")
	cfg.R2.Bucket = getEnvFirst([]string{"R2_BUCKET", "R2_BUCKET_NAME"}, "")
	cfg.R2.PublicURL = getEnv("R2_PUBLIC_URL", "")

	return cfg
}

func (c *Config) IsProduction() bool {
	return c.Server.Env == "production"
}

// Validate ensures all crucial secrets are properly injected from Infisical Cloud.
func (c *Config) Validate() error {
	if c.PocketBase.URL == "" {
		return fmt.Errorf("environment variable POCKETBASE_URL wajib terinjeksi dari Infisical Cloud")
	}
	if c.PocketBase.AdminEmail == "" {
		return fmt.Errorf("environment variable POCKETBASE_ADMIN_EMAIL wajib terinjeksi dari Infisical Cloud")
	}
	if c.PocketBase.AdminPassword == "" {
		return fmt.Errorf("environment variable POCKETBASE_ADMIN_PASSWORD wajib terinjeksi dari Infisical Cloud")
	}
	if c.JWT.Secret == "" || (c.IsProduction() && c.JWT.Secret == "dev-secret-loket-kemenag-barito-utara-do-not-use-in-production") {
		return fmt.Errorf("environment variable JWT_SECRET wajib terinjeksi dari Infisical Cloud pada mode production")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvFirst(keys []string, fallback string) string {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvIntFirst(keys []string, fallback int) int {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			if i, err := strconv.Atoi(v); err == nil {
				return i
			}
		}
	}
	return fallback
}