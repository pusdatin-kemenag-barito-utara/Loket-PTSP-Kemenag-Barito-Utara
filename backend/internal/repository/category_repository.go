package repository

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type CategoryRepository struct {
	DB *database.DB
}

type pbCategoryRecord struct {
	ID           string `json:"id"`
	Code         string `json:"code"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	Created      string `json:"created"`
	Updated      string `json:"updated"`
}

func (r *pbCategoryRecord) toModel() *model.Category {
	return &model.Category{
		ID:           r.ID,
		Code:         r.Code,
		Name:         r.Name,
		Description:  r.Description,
		DisplayOrder: r.DisplayOrder,
		IsActive:     r.IsActive,
		CreatedAt:    parseTime(r.CreatedAt, r.Created),
		UpdatedAt:    parseTime(r.UpdatedAt, r.Updated),
	}
}

func (r *CategoryRepository) ListActive(ctx context.Context) ([]model.Category, error) {
	query := url.Values{}
	query.Set("filter", "is_active = true")
	query.Set("sort", "+display_order,+code")
	query.Set("perPage", "100")

	var records []pbCategoryRecord
	_, err := r.DB.List(ctx, "categories", query, &records)
	if err != nil {
		return nil, err
	}

	cats := make([]model.Category, 0, len(records))
	for _, rec := range records {
		cats = append(cats, *rec.toModel())
	}
	return cats, nil
}

func (r *CategoryRepository) ListAll(ctx context.Context) ([]model.Category, error) {
	query := url.Values{}
	query.Set("sort", "+display_order,+code")
	query.Set("perPage", "100")

	var records []pbCategoryRecord
	_, err := r.DB.List(ctx, "categories", query, &records)
	if err != nil {
		return nil, err
	}

	cats := make([]model.Category, 0, len(records))
	for _, rec := range records {
		cats = append(cats, *rec.toModel())
	}
	return cats, nil
}

func (r *CategoryRepository) FindByID(ctx context.Context, id string) (*model.Category, error) {
	var rec pbCategoryRecord
	if err := r.DB.Get(ctx, "categories", id, &rec); err != nil {
		return nil, err
	}
	return rec.toModel(), nil
}

func (r *CategoryRepository) Create(ctx context.Context, c *model.Category) error {
	payload := map[string]any{
		"code":          strings.ToUpper(strings.TrimSpace(c.Code)),
		"name":          strings.TrimSpace(c.Name),
		"description":   strings.TrimSpace(c.Description),
		"display_order": c.DisplayOrder,
		"is_active":     c.IsActive,
		"created_at":    time.Now().Format(time.RFC3339),
		"updated_at":    time.Now().Format(time.RFC3339),
	}
	if c.ID != "" {
		payload["id"] = c.ID
	}

	var rec pbCategoryRecord
	if err := r.DB.Create(ctx, "categories", payload, &rec); err != nil {
		return err
	}

	created := rec.toModel()
	*c = *created
	return nil
}

func (r *CategoryRepository) Update(ctx context.Context, id, code, name, description string, displayOrder int, isActive bool) (*model.Category, error) {
	payload := map[string]any{
		"code":          strings.ToUpper(strings.TrimSpace(code)),
		"name":          strings.TrimSpace(name),
		"description":   strings.TrimSpace(description),
		"display_order": displayOrder,
		"is_active":     isActive,
		"updated_at":    time.Now().Format(time.RFC3339),
	}

	var rec pbCategoryRecord
	if err := r.DB.Update(ctx, "categories", id, payload, &rec); err != nil {
		return nil, err
	}
	return rec.toModel(), nil
}

func (r *CategoryRepository) Delete(ctx context.Context, id string) error {
	// Delete any queues referencing this category
	qQuery := url.Values{}
	qQuery.Set("filter", fmt.Sprintf("category_id = '%s'", escapeFilter(id)))
	qQuery.Set("perPage", "500")
	var queues []struct {
		ID string `json:"id"`
	}
	_, _ = r.DB.List(ctx, "queues", qQuery, &queues)
	for _, q := range queues {
		_ = r.DB.Delete(ctx, "queues", q.ID)
	}

	return r.DB.Delete(ctx, "categories", id)
}

func (r *CategoryRepository) IsCodeTaken(ctx context.Context, code, excludeID string) (bool, error) {
	upper := strings.ToUpper(strings.TrimSpace(code))
	filter := fmt.Sprintf("code = '%s'", escapeFilter(upper))
	if excludeID != "" {
		filter += fmt.Sprintf(" && id != '%s'", escapeFilter(excludeID))
	}

	count, err := r.DB.Count(ctx, "categories", filter)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}