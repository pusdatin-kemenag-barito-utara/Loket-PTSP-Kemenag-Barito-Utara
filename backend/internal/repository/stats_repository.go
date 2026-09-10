package repository

import (
	"context"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type StatsRepository struct {
	DB   *database.DB
	Zone *time.Location
}

func (r *StatsRepository) Today(ctx context.Context) (*model.Stats, error) {
	s := &model.Stats{}
	err := r.DB.GetContext(ctx, s, `
		SELECT
			COUNT(*) AS total_today,
			COUNT(*) FILTER (WHERE status = 'waiting') AS waiting,
			COUNT(*) FILTER (WHERE status = 'called') AS called,
			COUNT(*) FILTER (WHERE status = 'completed') AS completed,
			COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) FILTER (WHERE status = 'completed'), 0) AS avg_wait_min,
			COALESCE(MAX(ticket_number) + 1, 1) AS next_number
		FROM kemenag_loket.queues
		WHERE created_at::date = CURRENT_DATE`)
	if err != nil {
		return nil, err
	}

	s.Open = true
	s.IsOperational = r.isOperationalHours()
	return s, nil
}

// isOperationalHours returns true Mon-Fri between 08:00 and 16:30 WIB (UTC+7).
func (r *StatsRepository) isOperationalHours() bool {
	now := time.Now().In(r.Zone)
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return false
	}
	hm := now.Hour()*60 + now.Minute()
	return hm >= 8*60 && hm < 16*60+30
}