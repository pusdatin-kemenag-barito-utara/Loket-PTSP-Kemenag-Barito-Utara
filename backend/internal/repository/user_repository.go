package repository

import (
	"context"
	"strings"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type UserRepository struct {
	DB *database.DB
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	trimmed := strings.TrimSpace(username)
	u := &model.User{}
	err := r.DB.GetContext(ctx, u, `
		SELECT id, username, password_hash, name, role, created_at, updated_at
		FROM kemenag_loket.users
		WHERE LOWER(username) = LOWER($1)`, trimmed)
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

func (r *UserRepository) List(ctx context.Context) ([]model.User, error) {
	var users []model.User
	err := r.DB.SelectContext(ctx, &users, `
		SELECT id, username, password_hash, name, role, created_at, updated_at
		FROM kemenag_loket.users
		ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	if users == nil {
		users = []model.User{}
	}
	return users, nil
}

func (r *UserRepository) Create(ctx context.Context, u *model.User) error {
	return r.DB.GetContext(ctx, u, `
		INSERT INTO kemenag_loket.users (username, password_hash, name, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, username, password_hash, name, role, created_at, updated_at`,
		strings.TrimSpace(u.Username), u.PasswordHash, strings.TrimSpace(u.Name), u.Role)
}

func (r *UserRepository) Update(ctx context.Context, id, username, name, role, passwordHash string) (*model.User, error) {
	u := &model.User{}
	var err error
	username = strings.TrimSpace(username)
	name = strings.TrimSpace(name)
	if passwordHash != "" {
		err = r.DB.GetContext(ctx, u, `
			UPDATE kemenag_loket.users
			SET username = $2, name = $3, role = $4, password_hash = $5, updated_at = now()
			WHERE id = $1
			RETURNING id, username, password_hash, name, role, created_at, updated_at`,
			id, username, name, role, passwordHash)
	} else {
		err = r.DB.GetContext(ctx, u, `
			UPDATE kemenag_loket.users
			SET username = $2, name = $3, role = $4, updated_at = now()
			WHERE id = $1
			RETURNING id, username, password_hash, name, role, created_at, updated_at`,
			id, username, name, role)
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepository) Delete(ctx context.Context, id string) error {
	_, err := r.DB.ExecContext(ctx, `DELETE FROM kemenag_loket.users WHERE id = $1`, id)
	return err
}

func (r *UserRepository) IsUsernameTaken(ctx context.Context, username, excludeID string) (bool, error) {
	var count int
	trimmed := strings.TrimSpace(username)
	var err error
	if excludeID != "" {
		err = r.DB.GetContext(ctx, &count, `
			SELECT count(*) FROM kemenag_loket.users
			WHERE LOWER(username) = LOWER($1) AND id != $2`, trimmed, excludeID)
	} else {
		err = r.DB.GetContext(ctx, &count, `
			SELECT count(*) FROM kemenag_loket.users
			WHERE LOWER(username) = LOWER($1)`, trimmed)
	}
	if err != nil {
		return false, err
	}
	return count > 0, nil
}