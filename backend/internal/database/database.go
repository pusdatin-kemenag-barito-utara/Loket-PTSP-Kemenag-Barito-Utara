package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type DB struct {
	*sqlx.DB
}

const Schema = "kemenag_loket"

func Connect(dsn string) (*DB, error) {
	// pgx default is QueryExecModeCacheStatement, which can collide prepared
	// statement names across pooled connections ("statement already exists").
	// QueryExecModeExec sends extended-protocol unnamed statements, avoiding
	// the shared statement cache entirely.
	if !strings.Contains(dsn, "default_query_exec_mode=") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		dsn += sep + "default_query_exec_mode=exec"
	}

	db, err := sqlx.Connect("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	log.Println("database connected")
	return &DB{db}, nil
}

func (d *DB) Close() {
	if d.DB != nil {
		d.DB.Close()
	}
}