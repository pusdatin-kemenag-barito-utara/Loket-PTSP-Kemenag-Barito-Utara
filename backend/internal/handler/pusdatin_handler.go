package handler

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/repository"
)

type PusdatinHandler struct {
	Pusdatin *repository.PusdatinRepository
}

func (h *PusdatinHandler) Maintenance(c fiber.Ctx) error {
	inMaint, err := h.Pusdatin.IsMaintenance(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{Error: "internal", Message: err.Error()})
	}

	maintURL := ""
	satURL := strings.TrimRight(h.Pusdatin.SatelliteURL, "/")
	if satURL != "" {
		slug := h.Pusdatin.Slug
		if slug == "" {
			slug = "loket_ptsp_kemenag"
		}
		maintURL = fmt.Sprintf("%s/maintenance?app=%s", satURL, slug)
	}

	return c.JSON(fiber.Map{
		"maintenance":     inMaint,
		"maintenance_url": maintURL,
		"satellite_url":   satURL,
	})
}