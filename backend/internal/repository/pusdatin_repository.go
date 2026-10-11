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

// CheckStatus performs the live check against the satellite service endpoint.
func (r *PusdatinRepository) CheckStatus(ctx context.Context) (bool, error) {
	if strings.Contains(strings.ToLower(r.SatelliteURL), "maintenance") {
		return true, nil
	}
	return r.httpFallback(ctx)
}

// StartWatcher checks the service every interval (e.g. 10s) and broadcasts
// EventMaintenanceChanged to WebSocket clients immediately when the status changes.
func (r *PusdatinRepository) StartWatcher(ctx context.Context, hub *realtime.Hub, interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		// Run initial check immediately
		inMaint, err := r.CheckStatus(ctx)
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
				inMaint, err := r.CheckStatus(checkCtx)
				cancel()

				if err == nil {
					r.mu.Lock()
					prev := r.cachedStatus
					changed := (inMaint != prev)
					r.cachedStatus = inMaint
					r.lastChecked = time.Now()
					r.mu.Unlock()

					if changed {
						maintURL := ""
						satURL := strings.TrimRight(r.SatelliteURL, "/")
						if satURL != "" {
							slug := r.Slug
							if slug == "" {
								slug = "loket_ptsp_kemenag"
							}
							maintURL = fmt.Sprintf("%s/maintenance?app=%s", satURL, slug)
						}
						hub.Broadcast(realtime.EventMaintenanceChanged, map[string]any{
							"maintenance":     inMaint,
							"maintenance_url": maintURL,
						})
					}
				}
			}
		}
	}()
}

// IsMaintenance returns the cached maintenance state instantly (0ms overhead).
func (r *PusdatinRepository) IsMaintenance(ctx context.Context) (bool, error) {
	r.mu.RLock()
	if !r.lastChecked.IsZero() {
		status := r.cachedStatus
		r.mu.RUnlock()
		return status, nil
	}
	r.mu.RUnlock()

	inMaint, err := r.CheckStatus(ctx)
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