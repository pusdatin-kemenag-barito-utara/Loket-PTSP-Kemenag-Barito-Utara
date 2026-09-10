package handler

import (
	"github.com/gofiber/contrib/v3/websocket"
	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

type WSHandler struct {
	Svc *service.QueueService
	Hub *realtime.Hub
}

// Handler returns a fiber handler that streams queue events over WebSocket.
func (h *WSHandler) Handler() fiber.Handler {
	return websocket.New(func(conn *websocket.Conn) {
		cleanup := h.Hub.RegisterClient(conn)
		defer cleanup()
		realtime.ReadLoop(conn)
	})
}