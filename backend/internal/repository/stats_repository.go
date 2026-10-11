package repository

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type StatsRepository struct {
	DB   *database.DB
	Zone *time.Location
}

func (r *StatsRepository) Today(ctx context.Context) (*model.Stats, error) {
	todayStr := todayStartWIB()
	filter := fmt.Sprintf("created_at >= '%s'", todayStr)

	query := url.Values{}
	query.Set("filter", filter)
	query.Set("perPage", "500")

	var records []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", query, &records)
	if err != nil {
		return nil, err
	}

	totalToday := len(records)
	waiting := 0
	called := 0
	completed := 0
	maxTicket := 0
	var totalWaitMinutes float64
	completedCount := 0

	for _, rec := range records {
		if rec.TicketNumber > maxTicket {
			maxTicket = rec.TicketNumber
		}
		switch rec.Status {
		case string(model.StatusWaiting):
			waiting++
		case string(model.StatusCalled):
			called++
		case string(model.StatusCompleted):
			completed++
			if rec.CompletedAt != "" {
				createdT := parseTime(rec.CreatedAt, rec.Created)
				compT := parseTime(rec.CompletedAt, "")
				diff := compT.Sub(createdT).Minutes()
				if diff > 0 {
					totalWaitMinutes += diff
					completedCount++
				}
			}
		}
	}

	avgWait := 0.0
	if completedCount > 0 {
		avgWait = totalWaitMinutes / float64(completedCount)
	}

	nextNumber := maxTicket + 1
	if nextNumber < 1 {
		nextNumber = 1
	}

	return &model.Stats{
		TotalToday:    totalToday,
		Waiting:       waiting,
		Called:        called,
		Completed:     completed,
		AvgWaitMin:    avgWait,
		NextNumber:    nextNumber,
		Open:          true,
		IsOperational: r.isOperationalHours(),
	}, nil
}

// isOperationalHours returns true Mon-Fri between 08:00 and 16:30 WIB (UTC+7).
func (r *StatsRepository) isOperationalHours() bool {
	zone := r.Zone
	if zone == nil {
		zone = time.FixedZone("WIB", 7*60*60)
	}
	now := time.Now().In(zone)
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return false
	}
	hm := now.Hour()*60 + now.Minute()
	return hm >= 8*60 && hm < 16*60+30
}