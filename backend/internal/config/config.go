package config

import (
	"bufio"
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
	Database struct {
		URL string
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

	cfg.Database.URL = getEnv("DATABASE_URL", "")

	cfg.JWT.Secret = getEnv("JWT_SECRET", "")
	cfg.JWT.TTL = time.Duration(getEnvInt("JWT_TTL_HOURS", 24)) * time.Hour

	cfg.Turnstile.SecretKey = getEnv("TURNSTILE_SECRET_KEY", "")
	cfg.Turnstile.SiteKey = getEnvFirst([]string{"TURNSTILE_SITE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "PUBLIC_TURNSTILE_SITE_KEY"}, "")

	cfg.Pusdatin.SatelliteURL = getEnvFirst([]string{"SATELLITE_URL", "NEXT_PUBLIC_PUSDATIN_URL"}, "")
	cfg.Pusdatin.SatelliteSlug = getEnv("SATELLITE_APP_SLUG", "")
	cfg.Pusdatin.FallbackMS = getEnvInt("PUSDAIN_FALLBACK_MS", 3000)

	cfg.R2.AccountID = getEnv("R2_ACCOUNT_ID", "")
	cfg.R2.EndpointURL = getEnv("R2_ENDPOINT_URL", "")
	cfg.R2.AccessKeyID = getEnv("R2_ACCESS_KEY_ID", "")
	cfg.R2.SecretAccessKey = getEnv("R2_SECRET_ACCESS_KEY", "")
	cfg.R2.Bucket = getEnv("R2_BUCKET", "loket-ptsp")
	cfg.R2.PublicURL = getEnv("R2_PUBLIC_URL", "")

	return cfg
}

func (c *Config) IsProduction() bool {
	return c.Server.Env == "production"
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