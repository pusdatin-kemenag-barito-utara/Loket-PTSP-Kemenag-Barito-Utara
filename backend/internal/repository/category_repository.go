package repository

import (
	"context"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type CategoryRepository struct {
	DB *database.DB
}

func (r *CategoryRepository) ListActive(ctx context.Context) ([]model.Category, error) {
	var cats []model.Category
	err := r.DB.SelectContext(ctx, &cats, `
		SELECT id, code, name, description, display_order, is_active, created_at, updated_at
		FROM kemenag_loket.categories
		WHERE is_active = true
		ORDER BY display_order ASC`)
	if err != nil {
		return nil, err
	}
	return cats, nil
}

func (r *CategoryRepository) FindByID(ctx context.Context, id string) (*model.Category, error) {
	c := &model.Category{}
	err := r.DB.GetContext(ctx, c, `
		SELECT id, code, name, description, display_order, is_active, created_at, updated_at
		FROM kemenag_loket.categories
		WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return c, nil
}