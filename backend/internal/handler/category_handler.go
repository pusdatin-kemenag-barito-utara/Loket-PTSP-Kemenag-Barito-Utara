package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/repository"
)

type CategoryHandler struct {
	Categories *repository.CategoryRepository
}

func (h *CategoryHandler) List(c fiber.Ctx) error {
	cats, err := h.Categories.ListActive(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{Error: "internal", Message: err.Error()})
	}
	return c.JSON(cats)
}