package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
)

type PusdatinRepository struct {
	DB           *database.DB
	SatelliteURL string
	Slug         string
	FallbackMS   int
	Client       *http.Client
}

type satelliteApp struct {
	ID     string `db:"id" json:"id"`
	Name   string `db:"name" json:"name"`
	Status string `db:"status" json:"status"`
}

// IsMaintenance returns true when the app is under maintenance.
// Tier 1: if SatelliteURL contains "maintenance", force maintenance on.
// Tier 2: query kemenag_pusdatin.satellite_apps for a row matching this app's
//
//	slug (id) or name; status = 'maintenance' means under maintenance.
//
// Tier 3: fallback HTTP check when the table is unreachable (optional).
func (r *PusdatinRepository) IsMaintenance(ctx context.Context) (bool, error) {
	if strings.Contains(strings.ToLower(r.SatelliteURL), "maintenance") {
		return true, nil
	}

	needle := r.Slug
	if needle == "" {
		needle = "loket"
	}

	var apps []satelliteApp
	err := r.DB.SelectContext(ctx, &apps, `
		SELECT id, name, status
		FROM kemenag_pusdatin.satellite_apps
		WHERE id = $1 OR lower(name) LIKE '%' || lower($1) || '%'
		LIMIT 1`, needle)
	if err != nil {
		return r.httpFallback(ctx)
	}
	if len(apps) > 0 {
		return strings.ToLower(apps[0].Status) == "maintenance", nil
	}
	return false, nil
}

// httpFallback checks the satellite endpoint for an explicit maintenance flag.
func (r *PusdatinRepository) httpFallback(ctx context.Context) (bool, error) {
	if r.SatelliteURL == "" {
		return false, nil
	}
	client := r.Client
	if client == nil {
		client = &http.Client{Timeout: time.Duration(r.FallbackMS) * time.Millisecond}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.SatelliteURL+"/api/status", nil)
	if err != nil {
		return false, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("satellite unreachable: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return false, err
	}

	var status struct {
		Maintenance bool `json:"maintenance"`
	}
	if err := json.Unmarshal(body, &status); err != nil {
		return false, err
	}
	return status.Maintenance, nil
}