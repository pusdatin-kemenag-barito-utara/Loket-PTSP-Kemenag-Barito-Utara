package handler

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

type CategoryHandler struct {
	Categories *repository.CategoryRepository
	QueueSvc   *service.QueueService
	Hub        *realtime.Hub
}

func (h *CategoryHandler) broadcastCategories(ctx context.Context) {
	if h.Hub == nil {
		return
	}
	if cats, err := h.Categories.ListActive(ctx); err == nil {
		h.Hub.Broadcast(realtime.EventCategoriesUpdated, cats)
	}
}

type CreateCategoryRequest struct {
	Code         string `json:"code"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
	IsActive     bool   `json:"is_active"`
}

type UpdateCategoryRequest struct {
	Code         string `json:"code"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	DisplayOrder int    `json:"display_order"`
	IsActive     bool   `json:"is_active"`
}

type ResetQueuesRequest struct {
	CategoryID string `json:"category_id"`
}

func (h *CategoryHandler) List(c fiber.Ctx) error {
	all := c.Query("all") == "true"
	var cats []model.Category
	var err error
	if all {
		cats, err = h.Categories.ListAll(c.Context())
	} else {
		cats, err = h.Categories.ListActive(c.Context())
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memuat data seksi layanan",
		})
	}
	if cats == nil {
		cats = []model.Category{}
	}
	return c.JSON(cats)
}

func (h *CategoryHandler) Create(c fiber.Ctx) error {
	req := &CreateCategoryRequest{IsActive: true}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Format data tidak valid",
		})
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "validation_error",
			Message: "Kode seksi (misal A, B, dst) dan nama seksi wajib diisi",
		})
	}

	taken, err := h.Categories.IsCodeTaken(c.Context(), req.Code, "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memeriksa keunikan kode",
		})
	}
	if taken {
		return c.Status(fiber.StatusConflict).JSON(model.ErrorResponse{
			Error:   "code_taken",
			Message: "Kode seksi tersebut sudah digunakan",
		})
	}

	cat := &model.Category{
		Code:         req.Code,
		Name:         req.Name,
		Description:  strings.TrimSpace(req.Description),
		DisplayOrder: req.DisplayOrder,
		IsActive:     req.IsActive,
	}

	if err := h.Categories.Create(c.Context(), cat); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal menambahkan seksi ke database",
		})
	}

	h.broadcastCategories(c.Context())
	return c.Status(fiber.StatusCreated).JSON(cat)
}

func (h *CategoryHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "ID seksi diperlukan",
		})
	}

	req := &UpdateCategoryRequest{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Format data tidak valid",
		})
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "validation_error",
			Message: "Kode seksi dan nama seksi wajib diisi",
		})
	}

	taken, err := h.Categories.IsCodeTaken(c.Context(), req.Code, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memeriksa keunikan kode",
		})
	}
	if taken {
		return c.Status(fiber.StatusConflict).JSON(model.ErrorResponse{
			Error:   "code_taken",
			Message: "Kode seksi tersebut sudah digunakan oleh seksi lain",
		})
	}

	cat, err := h.Categories.Update(c.Context(), id, req.Code, req.Name, strings.TrimSpace(req.Description), req.DisplayOrder, req.IsActive)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memperbarui seksi",
		})
	}

	h.broadcastCategories(c.Context())
	return c.JSON(cat)
}

func (h *CategoryHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "ID seksi diperlukan",
		})
	}

	if err := h.Categories.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal menghapus seksi dari database",
		})
	}

	h.broadcastCategories(c.Context())
	return c.JSON(fiber.Map{"ok": true, "message": "Seksi berhasil dihapus"})
}

func (h *CategoryHandler) ResetQueues(c fiber.Ctx) error {
	req := &ResetQueuesRequest{}
	_ = c.Bind().Body(req)

	if h.QueueSvc != nil {
		if err := h.QueueSvc.ResetToday(c.Context(), req.CategoryID); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
				Error:   "database_error",
				Message: "Gagal mereset nomor antrian hari ini",
			})
		}
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Nomor antrian hari ini berhasil direset ke awal",
	})
}