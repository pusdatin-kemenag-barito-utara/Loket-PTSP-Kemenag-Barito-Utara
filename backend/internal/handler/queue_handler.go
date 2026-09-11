package handler

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

type QueueHandler struct {
	Svc *service.QueueService
}

type createTicketRequest struct {
	CategoryID string `json:"category_id"`
}

type queueIDRequest struct {
	QueueID string `json:"queue_id"`
}

type adjustRequest struct {
	QueueID string `json:"queue_id"`
	Status  string `json:"status"`
}

func (h *QueueHandler) CreateTicket(c fiber.Ctx) error {
	req := &createTicketRequest{}
	if err := c.Bind().Body(req); err != nil || req.CategoryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "category_id required"})
	}

	q, err := h.Svc.CreateTicket(c.Context(), req.CategoryID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "create_failed", Message: err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(q)
}

func (h *QueueHandler) Call(c fiber.Ctx) error {
	req := &queueIDRequest{}
	if err := c.Bind().Body(req); err != nil || req.QueueID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "queue_id required"})
	}

	q, err := h.Svc.Call(c.Context(), req.QueueID)
	if err != nil {
		status := fiber.StatusBadRequest
		if service.IsAlreadyCalled(err) {
			status = fiber.StatusConflict
		}
		return c.Status(status).JSON(model.ErrorResponse{Error: "call_failed", Message: err.Error()})
	}
	return c.JSON(q)
}

func (h *QueueHandler) Recall(c fiber.Ctx) error {
	req := &queueIDRequest{}
	if err := c.Bind().Body(req); err != nil || req.QueueID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "queue_id required"})
	}

	q, err := h.Svc.Recall(c.Context(), req.QueueID)
	if err != nil {
		status := fiber.StatusBadRequest
		if service.IsNoQueue(err) {
			status = fiber.StatusNotFound
		}
		return c.Status(status).JSON(model.ErrorResponse{Error: "recall_failed", Message: err.Error()})
	}
	return c.JSON(q)
}

func (h *QueueHandler) Adjust(c fiber.Ctx) error {
	req := &adjustRequest{}
	if err := c.Bind().Body(req); err != nil || req.QueueID == "" || req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "queue_id and status required"})
	}

	q, err := h.Svc.Adjust(c.Context(), req.QueueID, req.Status)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "adjust_failed", Message: err.Error()})
	}
	return c.JSON(q)
}

func (h *QueueHandler) Track(c fiber.Ctx) error {
	// Support both ?id= UUID and /:id
	id := c.Query("id")
	if id == "" {
		id = c.Params("id")
	}
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "id required"})
	}

	ticket, err := h.Svc.Track(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(model.ErrorResponse{Error: "not_found", Message: "tiket tidak ditemukan"})
	}
	return c.JSON(ticket)
}

func (h *QueueHandler) Lookup(c fiber.Ctx) error {
	code := c.Query("code")
	numberStr := c.Query("number")
	if code == "" || numberStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "code and number required"})
	}

	number, err := strconv.Atoi(numberStr)
	if err != nil || number <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "invalid number"})
	}

	ticket, err := h.Svc.TrackByTicket(c.Context(), strings.ToUpper(code), number)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(model.ErrorResponse{Error: "not_found", Message: "tiket tidak ditemukan"})
	}
	return c.JSON(ticket)
}

func (h *QueueHandler) Waiting(c fiber.Ctx) error {
	qs, err := h.Svc.TodayWaiting(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{Error: "internal", Message: err.Error()})
	}
	if qs == nil {
		qs = []model.Queue{}
	}
	return c.JSON(qs)
}

func (h *QueueHandler) Stats(c fiber.Ctx) error {
	s, err := h.Svc.GetStats(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{Error: "internal", Message: err.Error()})
	}
	return c.JSON(s)
}