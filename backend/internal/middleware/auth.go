package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

const CtxUserKey = "user"

func Auth(svc *service.AuthService) fiber.Handler {
	return func(c fiber.Ctx) error {
		tokenStr := extractToken(c)
		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
		}

		claims, err := svc.ParseToken(tokenStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
		}

		c.Locals(CtxUserKey, claims)
		return c.Next()
	}
}

func extractToken(c fiber.Ctx) string {
	if t := c.Cookies(service.TokenCookieName); t != "" {
		return t
	}
	auth := c.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

func UserFromCtx(c fiber.Ctx) *service.Claims {
	if v, ok := c.Locals(CtxUserKey).(*service.Claims); ok {
		return v
	}
	return nil
}