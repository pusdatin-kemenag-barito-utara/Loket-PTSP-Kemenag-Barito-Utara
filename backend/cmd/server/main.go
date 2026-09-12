package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/kemenag-baritoutara/loket/internal/config"
	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/handler"
	"github.com/kemenag-baritoutara/loket/internal/middleware"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

func main() {
	cfg := config.Load()
	log.Printf("[Config] Environment terinjeksi: APP_ENV=%s, PORT=%s, Database terhubung=%t", cfg.Server.Env, cfg.Server.Port, cfg.Database.URL != "")

	db, err := database.Connect(cfg.Database.URL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	// Repositories
	userRepo := &repository.UserRepository{DB: db}
	categoryRepo := &repository.CategoryRepository{DB: db}
	queueRepo := &repository.QueueRepository{DB: db}
	statsRepo := &repository.StatsRepository{DB: db, Zone: zoneWIB()}
	pusdatinRepo := &repository.PusdatinRepository{
		DB:           db,
		SatelliteURL: cfg.Pusdatin.SatelliteURL,
		Slug:         cfg.Pusdatin.SatelliteSlug,
		FallbackMS:   cfg.Pusdatin.FallbackMS,
	}

	// Realtime hub
	hub := realtime.NewHub()
	go hub.Run()

	// Dynamic Pusdatin database status watcher (checks every 10s and broadcasts changes)
	pusdatinRepo.StartWatcher(context.Background(), hub, 10*time.Second)

	// Services
	authSvc := &service.AuthService{
		Users:     userRepo,
		Cfg:       cfg,
		Turnstile: service.NewTurnstileClient(cfg.Turnstile.SecretKey, cfg.Turnstile.SiteKey),
	}
	queueSvc := &service.QueueService{
		Queues: queueRepo,
		Stats:  statsRepo,
		Hub:    hub,
	}

	// Handlers
	authH := &handler.AuthHandler{Svc: authSvc}
	queueH := &handler.QueueHandler{Svc: queueSvc}
	categoryH := &handler.CategoryHandler{Categories: categoryRepo, QueueSvc: queueSvc, Hub: hub}
	pusdatinH := &handler.PusdatinHandler{Pusdatin: pusdatinRepo}
	userH := &handler.UserHandler{Users: userRepo}
	wsH := &handler.WSHandler{Svc: queueSvc, Hub: hub}

	tvSettingsRepo := &repository.TVSettingsRepository{DB: db}
	r2Svc := service.NewR2Service(cfg)
	tvH := &handler.TVHandler{Repo: tvSettingsRepo, R2: r2Svc, Hub: hub}

	app := fiber.New(fiber.Config{
		AppName:      "Loket PTSP Kemenag Barito Utara",
		BodyLimit:    300 * 1024 * 1024,
		ServerHeader: "Loket-PTSP",
	})

	app.Use(recover.New())
	app.Use(helmet.New())
	app.Use(logger.New(logger.Config{
		Next: func(c fiber.Ctx) bool {
			p := c.Path()
			return p == "/health" || p == "/api/v1/pusdatin/maintenance"
		},
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     originsList(cfg.Server.Origins),
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowCredentials: true,
	}))

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Strict anti-bruteforce rate limiter for login
	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 15 * time.Minute,
		KeyGenerator: func(c fiber.Ctx) string {
			return c.IP()
		},
		SkipSuccessfulRequests: true,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(model.ErrorResponse{
				Error:   "too_many_attempts",
				Message: "Terlalu banyak percobaan masuk gagal. Sistem mengunci login sementara selama 15 menit demi keamanan.",
			})
		},
	})

	v1 := app.Group("/api/v1")

	// Public
	v1.Post("/auth/login", loginLimiter, authH.Login)
	v1.Get("/categories", categoryH.List)
	v1.Get("/stats", queueH.Stats)
	v1.Get("/queue/waiting", queueH.Waiting)
	v1.Get("/queue/track", queueH.Track)
	v1.Get("/queue/lookup", queueH.Lookup)
	v1.Post("/queue", queueH.CreateTicket)
	v1.Get("/pusdatin/maintenance", pusdatinH.Maintenance)
	v1.Get("/tv/settings", tvH.GetSettings)
	v1.Get("/media/stream/*", tvH.StreamMedia)
	v1.Get("/ws/queue", wsH.Handler())

	// Protected (admin)
	admin := v1.Group("", middleware.Auth(authSvc))
	admin.Post("/auth/logout", authH.Logout)
	admin.Get("/auth/me", authH.Me)
	admin.Post("/queue/call", queueH.Call)
	admin.Post("/queue/recall", queueH.Recall)
	admin.Post("/queue/adjust", queueH.Adjust)

	// TV & Media Management (Cloudflare R2)
	admin.Put("/tv/settings", tvH.UpdateSettings)
	admin.Post("/media/upload", tvH.UploadMedia)
	admin.Post("/media/upload-chunk", tvH.UploadChunk)

	// User Management (CRUD)
	admin.Get("/users", userH.List)
	admin.Post("/users", userH.Create)
	admin.Put("/users/:id", userH.Update)
	admin.Delete("/users/:id", userH.Delete)

	// Category / Seksi Management (CRUD) & Queue Reset
	admin.Post("/categories", categoryH.Create)
	admin.Put("/categories/:id", categoryH.Update)
	admin.Delete("/categories/:id", categoryH.Delete)
	admin.Post("/categories/reset-queues", categoryH.ResetQueues)

	// Static Frontend Serving (Production)
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		if _, err := os.Stat("./frontend/dist"); err == nil {
			staticDir = "./frontend/dist"
		} else if _, err := os.Stat("./dist"); err == nil {
			staticDir = "./dist"
		}
	}

	if staticDir != "" {
		log.Printf("[Static] Serving frontend static assets from %s", staticDir)
		app.Use("/", static.New(staticDir, static.Config{
			IndexNames: []string{"index.html"},
			Compress:   true,
		}))

		// Fallback for Astro SSG pages without trailing slash (e.g. /kiosk -> /kiosk/index.html)
		app.Use(func(c fiber.Ctx) error {
			p := c.Path()
			if strings.HasPrefix(p, "/api") || strings.HasPrefix(p, "/ws") || p == "/health" {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
			}

			cleanPath := strings.Trim(p, "/")
			indexPath := filepath.Join(staticDir, cleanPath, "index.html")
			if _, err := os.Stat(indexPath); err == nil {
				return c.SendFile(indexPath)
			}

			htmlPath := filepath.Join(staticDir, cleanPath+".html")
			if _, err := os.Stat(htmlPath); err == nil {
				return c.SendFile(htmlPath)
			}

			return c.SendFile(filepath.Join(staticDir, "index.html"))
		})
	}

	log.Printf("listening on :%s", cfg.Server.Port)
	if err := app.Listen(":" + cfg.Server.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func zoneWIB() *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta") // WIB (UTC+7)
	if err != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}
	return loc
}

func originsList(s string) []string {
	if s == "" {
		return []string{"*"}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}