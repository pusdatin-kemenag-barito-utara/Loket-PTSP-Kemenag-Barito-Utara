package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/kemenag-baritoutara/loket/internal/config"
	"github.com/kemenag-baritoutara/loket/internal/database"
)

func main() {
	config.LoadEnv()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := database.Connect(dsn)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	dir, _ := filepath.Abs(".")
	migrationPath := filepath.Join(dir, "sql", "migration_legacy.sql")
	schemaPath := filepath.Join(dir, "sql", "schema.sql")
	seedPath := filepath.Join(dir, "sql", "seed.sql")

	if fileExists(migrationPath) {
		if err := runFile(db, migrationPath); err != nil {
			log.Fatalf("migration: %v", err)
		}
		log.Println("legacy migration applied")
	}

	if err := runFile(db, schemaPath); err != nil {
		log.Fatalf("schema: %v", err)
	}
	log.Println("schema applied")

	if err := runFile(db, seedPath); err != nil {
		log.Fatalf("seed: %v", err)
	}
	log.Println("seed applied")
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func runFile(db *database.DB, path string) error {
	content, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	_, err = db.Exec(string(content))
	return err
}