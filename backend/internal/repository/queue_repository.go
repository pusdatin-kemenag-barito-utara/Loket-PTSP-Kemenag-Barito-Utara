package repository

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type QueueRepository struct {
	DB *database.DB

	catMu    sync.RWMutex
	catCache map[string]catCacheEntry
	catExp   time.Time
}

type catCacheEntry struct {
	Code string
	Name string
}

var ErrNoQueue = errors.New("queue not found")
var ErrAlreadyCalled = errors.New("queue already called")
var ErrQueueClosed = errors.New("queue already completed or skipped")
var ErrNoWaiting = errors.New("no waiting queue")

type pbQueueRecord struct {
	ID           string `json:"id"`
	CategoryID   string `json:"category_id"`
	TicketNumber int    `json:"ticket_number"`
	Status       string `json:"status"`
	Source       string `json:"source"`
	CalledAt     string `json:"called_at"`
	CompletedAt  string `json:"completed_at"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	Created      string `json:"created"`
	Updated      string `json:"updated"`
}

func (r *pbQueueRecord) toModel() *model.Queue {
	q := &model.Queue{
		ID:           r.ID,
		CategoryID:   r.CategoryID,
		TicketNumber: r.TicketNumber,
		Status:       r.Status,
		Source:       r.Source,
		CreatedAt:    parseTime(r.CreatedAt, r.Created),
		UpdatedAt:    parseTime(r.UpdatedAt, r.Updated),
	}
	if r.CalledAt != "" {
		t := parseTime(r.CalledAt, "")
		q.CalledAt = &t
	}
	if r.CompletedAt != "" {
		t := parseTime(r.CompletedAt, "")
		q.CompletedAt = &t
	}
	return q
}

func todayStartWIB() string {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*60*60)
	}
	now := time.Now().In(loc)
	y, m, d := now.Date()
	start := time.Date(y, m, d, 0, 0, 0, 0, loc)
	return start.Format(time.RFC3339)
}

func (r *QueueRepository) categoryInfo(ctx context.Context, catID string) (string, string) {
	r.catMu.RLock()
	if r.catCache != nil && time.Now().Before(r.catExp) {
		if entry, ok := r.catCache[catID]; ok {
			r.catMu.RUnlock()
			return entry.Code, entry.Name
		}
	}
	r.catMu.RUnlock()

	r.catMu.Lock()
	defer r.catMu.Unlock()

	// Refresh cache
	query := url.Values{}
	query.Set("perPage", "100")
	var cats []pbCategoryRecord
	_, err := r.DB.List(ctx, "categories", query, &cats)
	if err == nil {
		r.catCache = make(map[string]catCacheEntry)
		r.catExp = time.Now().Add(5 * time.Minute)
		for _, c := range cats {
			r.catCache[c.ID] = catCacheEntry{Code: c.Code, Name: c.Name}
		}
		if entry, ok := r.catCache[catID]; ok {
			return entry.Code, entry.Name
		}
	}
	return "", ""
}

func (r *QueueRepository) attachCategory(ctx context.Context, q *model.Queue) {
	if q == nil {
		return
	}
	code, name := r.categoryInfo(ctx, q.CategoryID)
	q.CategoryCode = code
	q.CategoryName = name
}

func (r *QueueRepository) CreateTicket(ctx context.Context, categoryID string) (*model.Queue, error) {
	todayStr := todayStartWIB()
	filter := fmt.Sprintf("category_id = '%s' && created_at >= '%s'", escapeFilter(categoryID), todayStr)

	query := url.Values{}
	query.Set("filter", filter)
	query.Set("sort", "-ticket_number")
	query.Set("perPage", "1")

	var existing []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", query, &existing)
	if err != nil {
		return nil, err
	}

	nextNumber := 1
	if len(existing) > 0 && existing[0].TicketNumber > 0 {
		nextNumber = existing[0].TicketNumber + 1
	}

	nowStr := time.Now().Format(time.RFC3339)
	payload := map[string]any{
		"category_id":   categoryID,
		"ticket_number": nextNumber,
		"status":        string(model.StatusWaiting),
		"source":        string(model.SourceKiosk),
		"created_at":    nowStr,
		"updated_at":    nowStr,
	}

	var rec pbQueueRecord
	if err := r.DB.Create(ctx, "queues", payload, &rec); err != nil {
		return nil, err
	}

	q := rec.toModel()
	r.attachCategory(ctx, q)
	return q, nil
}

func (r *QueueRepository) FindByID(ctx context.Context, id string) (*model.Queue, error) {
	var rec pbQueueRecord
	if err := r.DB.Get(ctx, "queues", id, &rec); err != nil {
		return nil, ErrNoQueue
	}
	q := rec.toModel()
	r.attachCategory(ctx, q)
	return q, nil
}

func (r *QueueRepository) NextWaiting(ctx context.Context) (*model.Queue, error) {
	query := url.Values{}
	query.Set("filter", "status = 'waiting'")
	query.Set("sort", "+created_at")
	query.Set("perPage", "1")

	var records []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", query, &records)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, ErrNoWaiting
	}

	q := records[0].toModel()
	r.attachCategory(ctx, q)
	return q, nil
}

func (r *QueueRepository) Call(ctx context.Context, id string) (*model.Queue, error) {
	q, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if q.Status != string(model.StatusWaiting) {
		return nil, ErrAlreadyCalled
	}

	nowStr := time.Now().Format(time.RFC3339)
	payload := map[string]any{
		"status":     string(model.StatusCalled),
		"called_at":  nowStr,
		"updated_at": nowStr,
	}

	var rec pbQueueRecord
	if err := r.DB.Update(ctx, "queues", id, payload, &rec); err != nil {
		return nil, err
	}

	updated := rec.toModel()
	r.attachCategory(ctx, updated)
	return updated, nil
}

func (r *QueueRepository) Recall(ctx context.Context, id string) (*model.Queue, error) {
	q, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if q.Status == string(model.StatusCompleted) || q.Status == string(model.StatusSkipped) {
		return nil, ErrQueueClosed
	}

	nowStr := time.Now().Format(time.RFC3339)
	payload := map[string]any{
		"status":     string(model.StatusCalled),
		"called_at":  nowStr,
		"updated_at": nowStr,
	}

	var rec pbQueueRecord
	if err := r.DB.Update(ctx, "queues", id, payload, &rec); err != nil {
		return nil, err
	}

	updated := rec.toModel()
	r.attachCategory(ctx, updated)
	return updated, nil
}

func (r *QueueRepository) Adjust(ctx context.Context, id, status string) (*model.Queue, error) {
	if status != string(model.StatusCompleted) && status != string(model.StatusSkipped) && status != string(model.StatusWaiting) {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	q, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	nowStr := time.Now().Format(time.RFC3339)
	payload := map[string]any{
		"status":     status,
		"updated_at": nowStr,
	}

	if status == string(model.StatusCompleted) {
		payload["completed_at"] = nowStr
		if q.CalledAt == nil {
			payload["called_at"] = nowStr
		}
	} else if status == string(model.StatusWaiting) {
		payload["completed_at"] = ""
	}

	var rec pbQueueRecord
	if err := r.DB.Update(ctx, "queues", id, payload, &rec); err != nil {
		return nil, err
	}

	updated := rec.toModel()
	r.attachCategory(ctx, updated)
	return updated, nil
}

func (r *QueueRepository) Track(ctx context.Context, id string) (*model.Ticket, error) {
	q, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	aheadFilter := fmt.Sprintf("category_id = '%s' && status = 'waiting' && created_at < '%s'",
		escapeFilter(q.CategoryID), q.CreatedAt.Format(time.RFC3339))
	aheadCount, _ := r.DB.Count(ctx, "queues", aheadFilter)

	return &model.Ticket{
		ID:           q.ID,
		CategoryCode: q.CategoryCode,
		CategoryName: q.CategoryName,
		TicketNumber: q.TicketNumber,
		Status:       q.Status,
		QueueAhead:   aheadCount,
		CreatedAt:    q.CreatedAt,
	}, nil
}

func (r *QueueRepository) TrackByTicket(ctx context.Context, code string, number int) (*model.Ticket, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	query := url.Values{}
	query.Set("filter", fmt.Sprintf("code = '%s'", escapeFilter(code)))
	query.Set("perPage", "1")

	var cats []pbCategoryRecord
	_, err := r.DB.List(ctx, "categories", query, &cats)
	if err != nil || len(cats) == 0 {
		return nil, ErrNoQueue
	}

	catID := cats[0].ID
	qQuery := url.Values{}
	qQuery.Set("filter", fmt.Sprintf("category_id = '%s' && ticket_number = %d", escapeFilter(catID), number))
	qQuery.Set("sort", "-created_at")
	qQuery.Set("perPage", "1")

	var qs []pbQueueRecord
	_, err = r.DB.List(ctx, "queues", qQuery, &qs)
	if err != nil || len(qs) == 0 {
		return nil, ErrNoQueue
	}

	q := qs[0].toModel()
	q.CategoryCode = cats[0].Code
	q.CategoryName = cats[0].Name

	aheadFilter := fmt.Sprintf("category_id = '%s' && status = 'waiting' && created_at < '%s'",
		escapeFilter(catID), q.CreatedAt.Format(time.RFC3339))
	aheadCount, _ := r.DB.Count(ctx, "queues", aheadFilter)

	return &model.Ticket{
		ID:           q.ID,
		CategoryCode: q.CategoryCode,
		CategoryName: q.CategoryName,
		TicketNumber: q.TicketNumber,
		Status:       q.Status,
		QueueAhead:   aheadCount,
		CreatedAt:    q.CreatedAt,
	}, nil
}

func (r *QueueRepository) CurrentlyCalled(ctx context.Context) (*model.Queue, error) {
	// First check waiting
	wQuery := url.Values{}
	wQuery.Set("filter", "status = 'waiting'")
	wQuery.Set("sort", "+created_at")
	wQuery.Set("perPage", "1")

	var waiting []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", wQuery, &waiting)
	if err == nil && len(waiting) > 0 {
		q := waiting[0].toModel()
		r.attachCategory(ctx, q)
		return q, nil
	}

	// Fallback to most recent called
	cQuery := url.Values{}
	cQuery.Set("filter", "status = 'called'")
	cQuery.Set("sort", "-called_at")
	cQuery.Set("perPage", "1")

	var called []pbQueueRecord
	_, err = r.DB.List(ctx, "queues", cQuery, &called)
	if err == nil && len(called) > 0 {
		q := called[0].toModel()
		r.attachCategory(ctx, q)
		return q, nil
	}

	return nil, ErrNoWaiting
}

func (r *QueueRepository) RecentCalls(ctx context.Context, limit int) ([]model.Queue, error) {
	if limit <= 0 {
		limit = 10
	}

	query := url.Values{}
	query.Set("filter", "(status = 'called' || status = 'completed') && called_at != ''")
	query.Set("sort", "-called_at")
	query.Set("perPage", strconv.Itoa(limit))

	var records []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", query, &records)
	if err != nil {
		return nil, err
	}

	qs := make([]model.Queue, 0, len(records))
	for _, rec := range records {
		q := rec.toModel()
		r.attachCategory(ctx, q)
		qs = append(qs, *q)
	}
	return qs, nil
}

func (r *QueueRepository) TodayWaiting(ctx context.Context) ([]model.Queue, error) {
	query := url.Values{}
	query.Set("filter", "status = 'waiting'")
	query.Set("sort", "+created_at")
	query.Set("perPage", "100")

	var records []pbQueueRecord
	_, err := r.DB.List(ctx, "queues", query, &records)
	if err != nil {
		return nil, err
	}

	qs := make([]model.Queue, 0, len(records))
	for _, rec := range records {
		q := rec.toModel()
		r.attachCategory(ctx, q)
		qs = append(qs, *q)
	}
	return qs, nil
}

func (r *QueueRepository) ResetToday(ctx context.Context, categoryID string) error {
	todayStr := todayStartWIB()
	filter := fmt.Sprintf("created_at >= '%s'", todayStr)
	if categoryID != "" && categoryID != "all" {
		filter += fmt.Sprintf(" && category_id = '%s'", escapeFilter(categoryID))
	}

	query := url.Values{}
	query.Set("filter", filter)
	query.Set("perPage", "500")

	var records []struct {
		ID string `json:"id"`
	}
	_, err := r.DB.List(ctx, "queues", query, &records)
	if err != nil {
		return err
	}

	for _, rec := range records {
		_ = r.DB.Delete(ctx, "queues", rec.ID)
	}
	return nil
}