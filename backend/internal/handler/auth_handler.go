package handler

import (
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/middleware"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

var validUsernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_.@+-]+$`)

const CookieMaxAge = 60 * 60 * 24 // 24h seconds

type AuthHandler struct {
	Svc *service.AuthService
}

func (h *AuthHandler) Config(c fiber.Ctx) error {
	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Set("Pragma", "no-cache")
	return c.JSON(fiber.Map{
		"turnstile_site_key": h.Svc.Cfg.Turnstile.SiteKey,
	})
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	// Strict anti-caching & security headers
	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Set("Pragma", "no-cache")
	c.Set("X-Content-Type-Options", "nosniff")
	c.Set("X-Frame-Options", "DENY")
	c.Set("Referrer-Policy", "strict-origin-when-cross-origin")

	req := &model.LoginRequest{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad_request", Message: "Format data masukan tidak valid"})
	}

	// Anti-XSS / Anti-Injection: sanitize username and password
	req.Username = strings.TrimSpace(req.Username)
	req.Username = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, req.Username)

	if req.Username == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "bad_request", Message: "Username dan password wajib diisi"})
	}

	if len(req.Username) > 100 || !validUsernameRegex.MatchString(req.Username) {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "invalid_format",
			Message: "Format username tidak valid. Hanya diperbolehkan huruf, angka, dan karakter email standard.",
		})
	}
	if len(req.Password) > 128 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "invalid_format",
			Message: "Password melebihi batas panjang maksimum (128 karakter).",
		})
	}

	resp, err := h.Svc.Login(c.Context(), req)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			return c.Status(fiber.StatusUnauthorized).JSON(model.ErrorResponse{Error: "invalid_credentials", Message: "Username atau password salah"})
		}
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{Error: "captcha_failed", Message: err.Error()})
	}

	// Invalidate any previous session and issue fresh secure HttpOnly cookie
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
	// Expire the token cookie immediately
	c.Cookie(&fiber.Cookie{
		Name:     service.TokenCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Now().Add(-100 * time.Hour),
		HTTPOnly: true,
		Secure:   c.Protocol() == "https",
		SameSite: "Lax",
	})

	// Instruct modern browsers to wipe cache, cookies, and local session storage for this origin
	c.Set("Clear-Site-Data", `"cache", "cookies", "storage"`)
	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")

	return c.JSON(fiber.Map{"ok": true, "message": "logged out successfully"})
}

func (h *AuthHandler) Me(c fiber.Ctx) error {
	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Set("Pragma", "no-cache")

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