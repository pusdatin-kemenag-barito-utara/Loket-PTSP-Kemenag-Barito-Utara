package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type UserRepository struct {
	DB *database.DB
}

type pbUserRecord struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash string `json:"password_hash"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	Created      string `json:"created"`
	Updated      string `json:"updated"`
}

func parseTime(s1, s2 string) time.Time {
	val := s1
	if val == "" {
		val = s2
	}
	if val == "" {
		return time.Now()
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999Z07:00",
		"2006-01-02 15:04:05.999Z",
		"2006-01-02 15:04:05",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, val); err == nil {
			return t
		}
	}
	return time.Now()
}

func (r *pbUserRecord) toModel() *model.User {
	u := &model.User{
		ID:           r.ID,
		Username:     r.Username,
		PasswordHash: r.PasswordHash,
		Name:         r.Name,
		Role:         model.Role(r.Role),
		CreatedAt:    parseTime(r.CreatedAt, r.Created),
		UpdatedAt:    parseTime(r.UpdatedAt, r.Updated),
	}
	if u.Username == "" && r.Email != "" {
		u.Username = r.Email
	}
	if u.Role == "" {
		u.Role = model.RoleAdmin
	}
	return u
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	trimmed := strings.TrimSpace(username)
	query := url.Values{}
	// PocketBase filter syntax for string comparison:
	query.Set("filter", fmt.Sprintf("username = '%s' || email = '%s'", escapeFilter(trimmed), escapeFilter(trimmed)))
	query.Set("perPage", "1")

	var records []pbUserRecord
	_, err := r.DB.List(ctx, "users", query, &records)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("user not found")
	}
	return records[0].toModel(), nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
	var rec pbUserRecord
	if err := r.DB.Get(ctx, "users", id, &rec); err != nil {
		return nil, err
	}
	return rec.toModel(), nil
}

func (r *UserRepository) List(ctx context.Context) ([]model.User, error) {
	query := url.Values{}
	query.Set("sort", "+created")
	query.Set("perPage", "200")

	var records []pbUserRecord
	_, err := r.DB.List(ctx, "users", query, &records)
	if err != nil {
		return nil, err
	}

	users := make([]model.User, 0, len(records))
	for _, rec := range records {
		users = append(users, *rec.toModel())
	}
	return users, nil
}

func (r *UserRepository) Create(ctx context.Context, u *model.User) error {
	username := strings.TrimSpace(u.Username)
	email := username
	if !strings.Contains(email, "@") {
		email = fmt.Sprintf("%s@loket.kemenag.local", username)
	}

	randomPass := generateRandomPassword(16)
	payload := map[string]any{
		"username":        username,
		"email":           email,
		"password_hash":   u.PasswordHash,
		"name":            strings.TrimSpace(u.Name),
		"role":            string(u.Role),
		"password":        randomPass,
		"passwordConfirm": randomPass,
		"verified":        true,
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
	}
	if u.ID != "" {
		payload["id"] = u.ID
	}

	var rec pbUserRecord
	if err := r.DB.Create(ctx, "users", payload, &rec); err != nil {
		return err
	}

	created := rec.toModel()
	*u = *created
	return nil
}

func (r *UserRepository) Update(ctx context.Context, id, username, name, role, passwordHash string) (*model.User, error) {
	username = strings.TrimSpace(username)
	name = strings.TrimSpace(name)

	payload := map[string]any{
		"username":   username,
		"name":       name,
		"role":       role,
		"updated_at": time.Now().Format(time.RFC3339),
	}
	if strings.Contains(username, "@") {
		payload["email"] = username
	}
	if passwordHash != "" {
		payload["password_hash"] = passwordHash
	}

	var rec pbUserRecord
	if err := r.DB.Update(ctx, "users", id, payload, &rec); err != nil {
		return nil, err
	}
	return rec.toModel(), nil
}

func (r *UserRepository) Delete(ctx context.Context, id string) error {
	return r.DB.Delete(ctx, "users", id)
}

func (r *UserRepository) IsUsernameTaken(ctx context.Context, username, excludeID string) (bool, error) {
	trimmed := strings.TrimSpace(username)
	filter := fmt.Sprintf("(username = '%s' || email = '%s')", escapeFilter(trimmed), escapeFilter(trimmed))
	if excludeID != "" {
		filter += fmt.Sprintf(" && id != '%s'", escapeFilter(excludeID))
	}

	count, err := r.DB.Count(ctx, "users", filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func escapeFilter(val string) string {
	s := strings.ReplaceAll(val, "\\", "\\\\")
	return strings.ReplaceAll(s, "'", "\\'")
}

func generateRandomPassword(length int) string {
	b := make([]byte, length)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b) + "!A1a"
}