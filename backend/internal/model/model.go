package model

import "time"

type Role string

const (
	RoleAdmin Role = "admin"
)

type QueueStatus string

const (
	StatusWaiting   QueueStatus = "waiting"
	StatusCalled    QueueStatus = "called"
	StatusCompleted QueueStatus = "completed"
	StatusSkipped   QueueStatus = "skipped"
)

type QueueSource string

const (
	SourceKiosk QueueSource = "kiosk"
	SourceAdmin QueueSource = "admin"
)

type User struct {
	ID           string    `db:"id" json:"id"`
	Username     string    `db:"username" json:"username"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Name         string    `db:"name" json:"name"`
	Role         Role      `db:"role" json:"role"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

type Category struct {
	ID           string    `db:"id" json:"id"`
	Code         string    `db:"code" json:"code"`
	Name         string    `db:"name" json:"name"`
	Description  string    `db:"description" json:"description"`
	DisplayOrder int       `db:"display_order" json:"display_order"`
	IsActive     bool      `db:"is_active" json:"is_active"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`
}

type Queue struct {
	ID           string    `db:"id" json:"id"`
	CategoryID   string    `db:"category_id" json:"category_id"`
	TicketNumber int       `db:"ticket_number" json:"ticket_number"`
	Status       string   `db:"status" json:"status"`
	Source       string    `db:"source" json:"source"`
	CalledAt     *time.Time `db:"called_at" json:"called_at"`
	CompletedAt  *time.Time `db:"completed_at" json:"completed_at"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at"`

	CategoryCode string `db:"category_code" json:"category_code"`
	CategoryName string `db:"category_name" json:"category_name"`
}

type Ticket struct {
	ID           string `db:"id" json:"id"`
	CategoryCode string `db:"category_code" json:"category_code"`
	CategoryName string `db:"category_name" json:"category_name"`
	TicketNumber int    `db:"ticket_number" json:"ticket_number"`
	Status       string `db:"status" json:"status"`
	QueueAhead   int    `db:"queue_ahead" json:"queue_ahead"`
	CreatedAt    time.Time `db:"created_at" json:"created_at"`
}

type Stats struct {
	TotalToday  int `db:"total_today" json:"total_today"`
	Waiting     int `db:"waiting" json:"waiting"`
	Called      int `db:"called" json:"called"`
	Completed   int `db:"completed" json:"completed"`
	AvgWaitMin  float64 `db:"avg_wait_min" json:"avg_wait_min"`
	NextNumber  int `db:"next_number" json:"next_number"`
	Open        bool `db:"open" json:"open"`
	IsOperational bool `db:"is_operational" json:"is_operational"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Token    string `json:"token"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CallRequest struct {
	QueueID string `json:"queue_id"`
}

type CallResponse struct {
	Queue *Queue `json:"queue"`
	Next  *Queue `json:"next,omitempty"`
}

type RecallRequest struct {
	QueueID string `json:"queue_id"`
}

type AdjustRequest struct {
	QueueID string `json:"queue_id"`
	Status  string `json:"status"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}