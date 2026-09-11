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
		ORDER BY display_order ASC, code ASC`)
	if err != nil {
		return nil, err
	}
	if cats == nil {
		cats = []model.Category{}
	}
	return cats, nil
}

func (r *CategoryRepository) ListAll(ctx context.Context) ([]model.Category, error) {
	var cats []model.Category
	err := r.DB.SelectContext(ctx, &cats, `
		SELECT id, code, name, description, display_order, is_active, created_at, updated_at
		FROM kemenag_loket.categories
		ORDER BY display_order ASC, code ASC`)
	if err != nil {
		return nil, err
	}
	if cats == nil {
		cats = []model.Category{}
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

func (r *CategoryRepository) Create(ctx context.Context, c *model.Category) error {
	return r.DB.GetContext(ctx, c, `
		INSERT INTO kemenag_loket.categories (code, name, description, display_order, is_active)
		VALUES (UPPER($1), $2, $3, $4, $5)
		RETURNING id, code, name, description, display_order, is_active, created_at, updated_at`,
		c.Code, c.Name, c.Description, c.DisplayOrder, c.IsActive)
}

func (r *CategoryRepository) Update(ctx context.Context, id, code, name, description string, displayOrder int, isActive bool) (*model.Category, error) {
	c := &model.Category{}
	err := r.DB.GetContext(ctx, c, `
		UPDATE kemenag_loket.categories
		SET code = UPPER($2), name = $3, description = $4, display_order = $5, is_active = $6, updated_at = now()
		WHERE id = $1
		RETURNING id, code, name, description, display_order, is_active, created_at, updated_at`,
		id, code, name, description, displayOrder, isActive)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepository) Delete(ctx context.Context, id string) error {
	_, _ = r.DB.ExecContext(ctx, `DELETE FROM kemenag_loket.queues WHERE category_id = $1`, id)
	_, err := r.DB.ExecContext(ctx, `DELETE FROM kemenag_loket.categories WHERE id = $1`, id)
	return err
}

func (r *CategoryRepository) IsCodeTaken(ctx context.Context, code, excludeID string) (bool, error) {
	var count int
	var err error
	if excludeID != "" {
		err = r.DB.GetContext(ctx, &count, `
			SELECT count(*) FROM kemenag_loket.categories
			WHERE UPPER(code) = UPPER($1) AND id != $2`, code, excludeID)
	} else {
		err = r.DB.GetContext(ctx, &count, `
			SELECT count(*) FROM kemenag_loket.categories
			WHERE UPPER(code) = UPPER($1)`, code)
	}
	if err != nil {
		return false, err
	}
	return count > 0, nil
}