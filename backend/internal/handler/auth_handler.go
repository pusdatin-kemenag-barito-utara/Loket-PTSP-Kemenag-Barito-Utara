package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/middleware"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

const CookieMaxAge = 60 * 60 * 24 // 24h seconds

type AuthHandler struct {
	Svc *service.AuthService
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	req := &model.LoginRequest{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "invalid body"})
	}
	if req.Username == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad request", Message: "username and password required"})
	}

	resp, err := h.Svc.Login(c.Context(), req)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			return c.Status(fiber.StatusUnauthorized).JSON(model.ErrorResponse{Error: "invalid credentials", Message: "username atau password salah"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "captcha", Message: err.Error()})
	}

	c.Cookie(&fiber.Cookie{
		Name:     service.TokenCookieName,
		Value:    resp.Token,
		Path:     "/",
		MaxAge:   CookieMaxAge,
		HTTPOnly: true,
		Secure:   c.Protocol() == "https",
		SameSite: "Lax",
	})

	return c.JSON(resp)
}

func (h *AuthHandler) Logout(c fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     service.TokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   c.Protocol() == "https",
		SameSite: "Lax",
	})
	return c.JSON(fiber.Map{"ok": true})
}

func (h *AuthHandler) Me(c fiber.Ctx) error {
	claims := middleware.UserFromCtx(c)
	if claims == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(model.ErrorResponse{Error: "unauthorized", Message: "not authenticated"})
	}
	return c.JSON(fiber.Map{
		"id":       claims.UserID,
		"username": claims.Username,
		"name":     claims.Name,
		"role":     claims.Role,
	})
}