package repository

import (
	"context"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type UserRepository struct {
	DB *database.DB
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	u := &model.User{}
	err := r.DB.GetContext(ctx, u, `
		SELECT id, username, password_hash, name, role, created_at, updated_at
		FROM kemenag_loket.users
		WHERE username = $1`, username)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*model.User, error) {
	u := &model.User{}
	err := r.DB.GetContext(ctx, u, `
		SELECT id, username, password_hash, name, role, created_at, updated_at
		FROM kemenag_loket.users
		WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return u, nil
}