package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type DB struct {
	BaseURL       string
	AdminEmail    string
	AdminPassword string
	Client        *http.Client

	mu       sync.RWMutex
	token    string
	tokenExp time.Time
}

type ListResult struct {
	Page       int `json:"page"`
	PerPage    int `json:"perPage"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

type listEnvelope struct {
	ListResult
	Items json.RawMessage `json:"items"`
}

// Connect initializes and authenticates the PocketBase database client.
func Connect(baseURL, adminEmail, adminPassword string) (*DB, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		return nil, fmt.Errorf("pocketbase URL is required")
	}

	db := &DB{
		BaseURL:       baseURL,
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
		Client: &http.Client{
			Timeout: 20 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := db.Authenticate(ctx); err != nil {
		return nil, fmt.Errorf("pocketbase auth: %w", err)
	}

	log.Printf("pocketbase connected to %s (as %s)", baseURL, adminEmail)
	return db, nil
}

func (d *DB) Close() {
	// PocketBase client is HTTP-based, no persistent socket pool to close
}

// Authenticate obtains a superuser JWT token from PocketBase.
func (d *DB) Authenticate(ctx context.Context) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	body, err := json.Marshal(map[string]string{
		"identity": d.AdminEmail,
		"password": d.AdminPassword,
	})
	if err != nil {
		return err
	}

	url := d.BaseURL + "/api/collections/_superusers/auth-with-password"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := d.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("superuser login failed (%d): %s", resp.StatusCode, string(respBody))
	}

	var authRes struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&authRes); err != nil {
		return err
	}

	if authRes.Token == "" {
		return fmt.Errorf("received empty token from pocketbase")
	}

	d.token = authRes.Token
	// Set expiry safely to 12 hours (PocketBase default token validity is 14 days)
	d.tokenExp = time.Now().Add(12 * time.Hour)
	return nil
}

// getToken retrieves a valid token, refreshing if necessary.
func (d *DB) getToken(ctx context.Context) (string, error) {
	d.mu.RLock()
	if d.token != "" && time.Now().Before(d.tokenExp) {
		tok := d.token
		d.mu.RUnlock()
		return tok, nil
	}
	d.mu.RUnlock()

	if err := d.Authenticate(ctx); err != nil {
		return "", err
	}

	d.mu.RLock()
	tok := d.token
	d.mu.RUnlock()
	return tok, nil
}

// Request executes an authenticated HTTP request against PocketBase.
func (d *DB) Request(ctx context.Context, method, path string, query url.Values, body any) ([]byte, int, error) {
	token, err := d.getToken(ctx)
	if err != nil {
		return nil, 0, err
	}

	reqURL := d.BaseURL + path
	if len(query) > 0 {
		reqURL += "?" + query.Encode()
	}

	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, reqURL, reqBody)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := d.Client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	// Token might have been revoked: re-auth once on 401
	if resp.StatusCode == http.StatusUnauthorized {
		if reAuthErr := d.Authenticate(ctx); reAuthErr == nil {
			token, _ = d.getToken(ctx)
			req, _ = http.NewRequestWithContext(ctx, method, reqURL, reqBody)
			req.Header.Set("Authorization", token)
			if body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			resp2, err2 := d.Client.Do(req)
			if err2 == nil {
				defer resp2.Body.Close()
				respBytes, _ = io.ReadAll(resp2.Body)
				return respBytes, resp2.StatusCode, nil
			}
		}
	}

	return respBytes, resp.StatusCode, nil
}

// Get fetches a single record by collection and ID.
func (d *DB) Get(ctx context.Context, collection, id string, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	respBytes, status, err := d.Request(ctx, http.MethodGet, path, nil, nil)
	if err != nil {
		return err
	}
	if status == http.StatusNotFound {
		return fmt.Errorf("record not found")
	}
	if status >= 300 {
		return fmt.Errorf("pocketbase get (%d): %s", status, string(respBytes))
	}
	return json.Unmarshal(respBytes, out)
}

// List fetches a paginated list of records from a collection.
func (d *DB) List(ctx context.Context, collection string, query url.Values, out any) (*ListResult, error) {
	path := fmt.Sprintf("/api/collections/%s/records", collection)
	respBytes, status, err := d.Request(ctx, http.MethodGet, path, query, nil)
	if err != nil {
		return nil, err
	}
	if status >= 300 {
		return nil, fmt.Errorf("pocketbase list (%d): %s", status, string(respBytes))
	}

	var env listEnvelope
	if err := json.Unmarshal(respBytes, &env); err != nil {
		return nil, err
	}

	if out != nil && len(env.Items) > 0 {
		if err := json.Unmarshal(env.Items, out); err != nil {
			return nil, err
		}
	}

	return &env.ListResult, nil
}

// Create inserts a new record into a collection.
func (d *DB) Create(ctx context.Context, collection string, data any, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records", collection)
	respBytes, status, err := d.Request(ctx, http.MethodPost, path, nil, data)
	if err != nil {
		return err
	}
	if status >= 300 {
		return fmt.Errorf("pocketbase create (%d): %s", status, string(respBytes))
	}
	if out != nil {
		return json.Unmarshal(respBytes, out)
	}
	return nil
}

// Update patches an existing record in a collection.
func (d *DB) Update(ctx context.Context, collection, id string, data any, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	respBytes, status, err := d.Request(ctx, http.MethodPatch, path, nil, data)
	if err != nil {
		return err
	}
	if status >= 300 {
		return fmt.Errorf("pocketbase update (%d): %s", status, string(respBytes))
	}
	if out != nil {
		return json.Unmarshal(respBytes, out)
	}
	return nil
}

// Delete removes a record by ID.
func (d *DB) Delete(ctx context.Context, collection, id string) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	respBytes, status, err := d.Request(ctx, http.MethodDelete, path, nil, nil)
	if err != nil {
		return err
	}
	if status == http.StatusNotFound {
		return nil
	}
	if status >= 300 {
		return fmt.Errorf("pocketbase delete (%d): %s", status, string(respBytes))
	}
	return nil
}

// Count returns the total number of records matching an optional filter.
func (d *DB) Count(ctx context.Context, collection, filter string) (int, error) {
	query := url.Values{}
	query.Set("perPage", "1")
	if filter != "" {
		query.Set("filter", filter)
	}
	res, err := d.List(ctx, collection, query, nil)
	if err != nil {
		return 0, err
	}
	return res.TotalItems, nil
}