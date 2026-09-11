package main

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/kemenag-baritoutara/loket/internal/config"
	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/handler"
	"github.com/kemenag-baritoutara/loket/internal/middleware"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

func main() {
	cfg := config.Load()

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

	v1 := app.Group("/api/v1")

	// Public
	v1.Post("/auth/login", authH.Login)
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