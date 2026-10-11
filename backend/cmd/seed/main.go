package main

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/config"
	"github.com/kemenag-baritoutara/loket/internal/database"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[Config Error] %v", err)
	}

	db, err := database.Connect(cfg.PocketBase.URL, cfg.PocketBase.AdminEmail, cfg.PocketBase.AdminPassword)
	if err != nil {
		log.Fatalf("pocketbase connect: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Println("checking and seeding default data in PocketBase...")

	// 1. Seed categories if empty
	count, err := db.Count(ctx, "categories", "")
	if err != nil {
		log.Fatalf("count categories: %v", err)
	}
	if count == 0 {
		defaultCats := []map[string]any{
			{"code": "A", "name": "Subbagian Tata Usaha", "description": "Layanan Umum / PTSP", "display_order": 1, "is_active": true},
			{"code": "B", "name": "Seksi Bimas Islam", "description": "Layanan Bimas Islam & Zakat/Wakaf", "display_order": 2, "is_active": true},
			{"code": "C", "name": "Seksi Pendidikan Agama Islam", "description": "Layanan Pendidikan Agama Islam", "display_order": 3, "is_active": true},
			{"code": "D", "name": "Seksi Pendidikan Madrasah", "description": "Layanan Madrasah dan Kurikulum", "display_order": 4, "is_active": true},
		}
		for _, cat := range defaultCats {
			cat["created_at"] = time.Now().Format(time.RFC3339)
			cat["updated_at"] = time.Now().Format(time.RFC3339)
			if err := db.Create(ctx, "categories", cat, nil); err != nil {
				log.Printf("create category %v failed: %v", cat["code"], err)
			}
		}
		log.Println("default categories seeded")
	} else {
		log.Printf("categories already seeded (%d records)", count)
	}

	// 2. Check tv_settings
	var tvSetting struct {
		ID string `json:"id"`
	}
	if err := db.Get(ctx, "tv_settings", "default", &tvSetting); err != nil {
		defaultTV := map[string]any{
			"id":              "default",
			"playback_mode":   "playlist",
			"single_mode":     "info",
			"running_text":    "Selamat Datang di Pelayanan Terpadu Satu Pintu (PTSP) Kantor Kementerian Agama Kabupaten Barito Utara",
			"office_address":  "Jl. Jenderal Sudirman No. 20, Muara Teweh, Barito Utara",
			"custom_maklumat": "Kami Siap Melayani dengan Sepenuh Hati, Cepat, Tepat, Akuntabel, dan Transparan.",
			"playlist":        []any{},
			"theme":           "light",
			"updated_at":      time.Now().Format(time.RFC3339),
		}
		if err := db.Create(ctx, "tv_settings", defaultTV, nil); err != nil {
			log.Printf("create default tv_settings: %v", err)
		} else {
			log.Println("default tv_settings created")
		}
	} else {
		log.Println("tv_settings already exists")
	}

	// 3. Check users
	uQuery := url.Values{}
	uQuery.Set("perPage", "5")
	var users []struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	_, _ = db.List(ctx, "users", uQuery, &users)
	fmt.Printf("pocketbase ready. current users count: %d\n", len(users))
}