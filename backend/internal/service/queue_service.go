package service

import (
	"context"
	"errors"

	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/repository"
)

type QueueService struct {
	Queues *repository.QueueRepository
	Stats  *repository.StatsRepository
	Hub    *realtime.Hub
}

func (s *QueueService) CreateTicket(ctx context.Context, categoryID string) (*model.Queue, error) {
	q, err := s.Queues.CreateTicket(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	s.Hub.Broadcast(realtime.EventQueueCreated, q)
	go s.broadcastStats(ctx)
	return q, nil
}

func (s *QueueService) Call(ctx context.Context, queueID string) (*model.Queue, error) {
	q, err := s.Queues.Call(ctx, queueID)
	if err != nil {
		return nil, err
	}
	s.Hub.Broadcast(realtime.EventQueueCalled, q)
	go s.broadcastStats(ctx)
	return q, nil
}

func (s *QueueService) Recall(ctx context.Context, queueID string) (*model.Queue, error) {
	q, err := s.Queues.Recall(ctx, queueID)
	if err != nil {
		return nil, err
	}
	s.Hub.Broadcast(realtime.EventQueueRecalled, q)
	go s.broadcastStats(ctx)
	return q, nil
}

func (s *QueueService) Adjust(ctx context.Context, queueID, status string) (*model.Queue, error) {
	q, err := s.Queues.Adjust(ctx, queueID, status)
	if err != nil {
		return nil, err
	}

	event := realtime.EventQueueCompleted
	if q.Status == string(model.StatusSkipped) {
		event = realtime.EventQueueSkipped
	}
	s.Hub.Broadcast(event, q)
	go s.broadcastStats(ctx)
	return q, nil
}

func (s *QueueService) Track(ctx context.Context, queueID string) (*model.Ticket, error) {
	return s.Queues.Track(ctx, queueID)
}

func (s *QueueService) TrackByTicket(ctx context.Context, code string, number int) (*model.Ticket, error) {
	return s.Queues.TrackByTicket(ctx, code, number)
}

func (s *QueueService) TodayWaiting(ctx context.Context) ([]model.Queue, error) {
	return s.Queues.TodayWaiting(ctx)
}

func (s *QueueService) GetStats(ctx context.Context) (*model.Stats, error) {
	return s.Stats.Today(ctx)
}

func (s *QueueService) broadcastStats(ctx context.Context) {
	if stat, err := s.Stats.Today(ctx); err == nil {
		s.Hub.Broadcast(realtime.EventStats, stat)
	}
}

var ErrQueueNotFound = repository.ErrNoQueue
var ErrAlreadyCalled = repository.ErrAlreadyCalled
var ErrQueueClosed = repository.ErrQueueClosed

func IsNoQueue(err error) bool { return errors.Is(err, repository.ErrNoQueue) }
func IsAlreadyCalled(err error) bool { return errors.Is(err, repository.ErrAlreadyCalled) }
func IsQueueClosed(err error) bool { return errors.Is(err, repository.ErrQueueClosed) }