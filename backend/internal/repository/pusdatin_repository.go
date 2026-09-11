package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
)

type PusdatinRepository struct {
	DB           *database.DB
	SatelliteURL string
	Slug         string
	FallbackMS   int
	Client       *http.Client

	mu           sync.RWMutex
	cachedStatus bool
	lastChecked  time.Time
}

type satelliteApp struct {
	ID     string `db:"id" json:"id"`
	Name   string `db:"name" json:"name"`
	Status string `db:"status" json:"status"`
}

// CheckStatusDB performs the live check against kemenag_pusdatin.satellite_apps table.
func (r *PusdatinRepository) CheckStatusDB(ctx context.Context) (bool, error) {
	if strings.Contains(strings.ToLower(r.SatelliteURL), "maintenance") {
		return true, nil
	}

	needle := r.Slug
	if needle == "" {
		needle = "loket_ptsp_kemenag"
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

	inMaint := false
	if len(apps) > 0 {
		inMaint = strings.ToLower(apps[0].Status) == "maintenance"
	}
	return inMaint, nil
}

// StartWatcher checks the database every interval (e.g. 10s) and broadcasts
// EventMaintenanceChanged to WebSocket clients immediately when the status changes.
func (r *PusdatinRepository) StartWatcher(ctx context.Context, hub *realtime.Hub, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		// Run initial check immediately
		inMaint, err := r.CheckStatusDB(ctx)
		if err == nil {
			r.mu.Lock()
			r.cachedStatus = inMaint
			r.lastChecked = time.Now()
			r.mu.Unlock()
		}

		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				checkCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				inMaint, err := r.CheckStatusDB(checkCtx)
				cancel()

				if err == nil {
					r.mu.Lock()
					prev := r.cachedStatus
					changed := (inMaint != prev)
					r.cachedStatus = inMaint
					r.lastChecked = time.Now()
					r.mu.Unlock()

					if changed {
						hub.Broadcast(realtime.EventMaintenanceChanged, map[string]any{
							"maintenance": inMaint,
						})
					}
				}
			}
		}
	}()
}

// IsMaintenance returns the cached maintenance state instantly (0ms, 0 database overhead).
func (r *PusdatinRepository) IsMaintenance(ctx context.Context) (bool, error) {
	r.mu.RLock()
	if !r.lastChecked.IsZero() {
		status := r.cachedStatus
		r.mu.RUnlock()
		return status, nil
	}
	r.mu.RUnlock()

	inMaint, err := r.CheckStatusDB(ctx)
	if err != nil {
		return false, err
	}

	r.mu.Lock()
	r.cachedStatus = inMaint
	r.lastChecked = time.Now()
	r.mu.Unlock()

	return inMaint, nil
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