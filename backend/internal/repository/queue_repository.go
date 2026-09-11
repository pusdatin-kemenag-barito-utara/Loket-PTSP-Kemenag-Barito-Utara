package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"database/sql"
	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type QueueRepository struct {
	DB *database.DB
}

var ErrNoQueue = errors.New("queue not found")
var ErrAlreadyCalled = errors.New("queue already called")
var ErrQueueClosed = errors.New("queue already completed or skipped")
var ErrNoWaiting = errors.New("no waiting queue")

func (r *QueueRepository) CreateTicket(ctx context.Context, categoryID string) (*model.Queue, error) {
	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var next int
	err = tx.GetContext(ctx, &next, `
		SELECT COALESCE(MAX(ticket_number), 0) + 1
		FROM kemenag_loket.queues
		WHERE category_id = $1
		  AND created_at::date = CURRENT_DATE`, categoryID)
	if err != nil {
		return nil, err
	}

	q := &model.Queue{}
	err = tx.GetContext(ctx, q, `
		INSERT INTO kemenag_loket.queues (category_id, ticket_number, status, source)
		VALUES ($1, $2, 'waiting', 'kiosk')
		RETURNING id, category_id, ticket_number, status, source, called_at, completed_at, created_at, updated_at`,
		categoryID, next)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	q.CategoryCode, q.CategoryName, err = r.categoryInfo(ctx, q.CategoryID)
	if err != nil {
		return nil, err
	}
	return q, nil
}

func (r *QueueRepository) FindByID(ctx context.Context, id string) (*model.Queue, error) {
	return r.getQueue(ctx, `WHERE q.id = $1`, id)
}

// NextWaiting returns the next waiting ticket for all categories ordered globally.
func (r *QueueRepository) NextWaiting(ctx context.Context) (*model.Queue, error) {
	q, err := r.getQueue(ctx, `
		WHERE q.status = 'waiting'
		ORDER BY q.created_at ASC
		LIMIT 1`)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNoWaiting
	}
	return q, err
}

func (r *QueueRepository) Call(ctx context.Context, id string) (*model.Queue, error) {
	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	q := &model.Queue{}
	err = tx.GetContext(ctx, q, `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE q.id = $1
		FOR UPDATE`, id)
	if err != nil {
		return nil, ErrNoQueue
	}

	if q.Status != string(model.StatusWaiting) {
		return nil, ErrAlreadyCalled
	}

	now := time.Now()
	err = tx.QueryRowxContext(ctx, `
		UPDATE kemenag_loket.queues
		SET status = 'called', called_at = $2
		WHERE id = $1
		RETURNING id, category_id, ticket_number, status, source, called_at, completed_at, created_at, updated_at`,
		id, now).StructScan(q)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return q, nil
}

func (r *QueueRepository) Recall(ctx context.Context, id string) (*model.Queue, error) {
	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	q := &model.Queue{}
	err = tx.GetContext(ctx, q, `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE q.id = $1
		FOR UPDATE`, id)
	if err != nil {
		return nil, ErrNoQueue
	}

	if q.Status == string(model.StatusCompleted) || q.Status == string(model.StatusSkipped) {
		return nil, ErrQueueClosed
	}

	err = tx.QueryRowxContext(ctx, `
		UPDATE kemenag_loket.queues
		SET status = 'called', called_at = now()
		WHERE id = $1
		RETURNING id, category_id, ticket_number, status, source, called_at, completed_at, created_at, updated_at`,
		id).StructScan(q)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return q, nil
}

func (r *QueueRepository) Adjust(ctx context.Context, id, status string) (*model.Queue, error) {
	if status != string(model.StatusCompleted) && status != string(model.StatusSkipped) && status != string(model.StatusWaiting) {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	tx, err := r.DB.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	q := &model.Queue{}
	err = tx.GetContext(ctx, q, `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE q.id = $1
		FOR UPDATE`, id)
	if err != nil {
		return nil, ErrNoQueue
	}

	var completedAt *time.Time
	if status == string(model.StatusCompleted) {
		t := time.Now()
		completedAt = &t
	}

	err = tx.QueryRowxContext(ctx, `
		UPDATE kemenag_loket.queues
		SET status = $2, completed_at = $3, called_at = CASE WHEN called_at IS NULL THEN $3 ELSE called_at END
		WHERE id = $1
		RETURNING id, category_id, ticket_number, status, source, called_at, completed_at, created_at, updated_at`,
		id, status, completedAt).StructScan(q)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return q, nil
}

func (r *QueueRepository) Track(ctx context.Context, id string) (*model.Ticket, error) {
	return r.TrackWhere(ctx, `q.id = $1`, id)
}

// TrackByTicket resolves a ticket by category code + number (e.g. A001).
func (r *QueueRepository) TrackByTicket(ctx context.Context, code string, number int) (*model.Ticket, error) {
	return r.TrackWhere(ctx, `c.code = $1 AND q.ticket_number = $2`, code, number)
}

func (r *QueueRepository) TrackWhere(ctx context.Context, where string, args ...any) (*model.Ticket, error) {
	t := &model.Ticket{}
	query := `
		SELECT q.id,
		       c.code AS category_code,
		       c.name AS category_name,
		       q.ticket_number,
		       q.status,
		       q.created_at,
		       (SELECT COUNT(*) FROM kemenag_loket.queues w
		        WHERE w.category_id = q.category_id
		          AND w.status = 'waiting'
		          AND w.created_at < q.created_at) AS queue_ahead
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE ` + where
	err := r.DB.GetContext(ctx, t, query, args...)
	if err != nil {
		return nil, ErrNoQueue
	}
	return t, nil
}

// CurrentlyCalled returns the first waiting queue as the one to display, falling
// back to the most recent called when nothing is waiting.
func (r *QueueRepository) CurrentlyCalled(ctx context.Context) (*model.Queue, error) {
	waiting, err := r.getQueue(ctx, `
		WHERE q.status = 'waiting'
		ORDER BY q.created_at ASC
		LIMIT 1`)
	if err == nil {
		return waiting, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	q, err := r.getQueue(ctx, `
		WHERE q.status = 'called'
		ORDER BY q.called_at DESC
		LIMIT 1`)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNoWaiting
	}
	return q, err
}

func (r *QueueRepository) RecentCalls(ctx context.Context, limit int) ([]model.Queue, error) {
	if limit <= 0 {
		limit = 10
	}
	var qs []model.Queue
	err := r.DB.SelectContext(ctx, &qs, `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE q.status IN ('called', 'completed')
		  AND q.called_at IS NOT NULL
		ORDER BY q.called_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	return qs, nil
}

func (r *QueueRepository) TodayWaiting(ctx context.Context) ([]model.Queue, error) {
	var qs []model.Queue
	err := r.DB.SelectContext(ctx, &qs, `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		WHERE q.status = 'waiting'
		ORDER BY q.created_at ASC`)
	if err != nil {
		return nil, err
	}
	return qs, nil
}

func (r *QueueRepository) getQueue(ctx context.Context, where string, args ...any) (*model.Queue, error) {
	q := &model.Queue{}
	query := `
		SELECT q.id, q.category_id, q.ticket_number, q.status, q.source, q.called_at, q.completed_at, q.created_at, q.updated_at,
		       c.code AS category_code, c.name AS category_name
		FROM kemenag_loket.queues q
		JOIN kemenag_loket.categories c ON c.id = q.category_id
		` + where
	err := r.DB.GetContext(ctx, q, query, args...)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoQueue
		}
		return nil, err
	}
	return q, nil
}

func (r *QueueRepository) categoryInfo(ctx context.Context, id string) (string, string, error) {
	var c struct {
		Code string `db:"code"`
		Name string `db:"name"`
	}
	err := r.DB.GetContext(ctx, &c, `
		SELECT code, name FROM kemenag_loket.categories WHERE id = $1`, id)
	if err != nil {
		return "", "", err
	}
	return c.Code, c.Name, nil
}

func (r *QueueRepository) ResetToday(ctx context.Context, categoryID string) error {
	if categoryID != "" && categoryID != "all" {
		_, err := r.DB.ExecContext(ctx, `
			DELETE FROM kemenag_loket.queues 
			WHERE category_id = $1 AND created_at::date = CURRENT_DATE`, categoryID)
		return err
	}
	_, err := r.DB.ExecContext(ctx, `
		DELETE FROM kemenag_loket.queues 
		WHERE created_at::date = CURRENT_DATE`)
	return err
}