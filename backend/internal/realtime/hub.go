package realtime

import (
	"encoding/json"
	"sync"

	"github.com/gofiber/contrib/v3/websocket"
)

type EventType string

const (
	EventQueueCreated EventType = "queue_created"
	EventQueueCalled  EventType = "queue_called"
	EventQueueRecalled EventType = "queue_recalled"
	EventQueueCompleted EventType = "queue_completed"
	EventQueueSkipped EventType = "queue_skipped"
	EventStats             EventType = "stats"
	EventTVSettingsUpdated EventType = "tv_settings_updated"
	EventCategoriesUpdated EventType = "categories_updated"
	EventMaintenanceChanged EventType = "maintenance_changed"
)

type Message struct {
	Type EventType  `json:"type"`
	Data any        `json:"data"`
}

type client struct {
	conn *websocket.Conn
	send chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[*client]bool
	register chan *client
	unregister chan *client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*client]bool),
		register:   make(chan *client),
		unregister: make(chan *client),
	}
}

// RegisterClient registers a websocket connection and returns a cleanup func.
// The caller must keep the connection alive (e.g. block on ReadMessage);
// after the read loop exits, call the returned cleanup to unregister.
func (h *Hub) RegisterClient(conn *websocket.Conn) func() {
	cl := &client{conn: conn, send: make(chan []byte, 16)}
	h.register <- cl

	go h.writePump(cl)

	return func() {
		h.unregister <- cl
		cl.conn.Close()
	}
}

// ReadLoop blocks reading messages on the connection and returns on error or
// when the peer closes. Call it from the websocket handler to keep the
// connection alive; the hub unregisters the client once it returns.
func ReadLoop(conn *websocket.Conn) {
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (h *Hub) Broadcast(event EventType, data any) {
	msg := Message{Type: event, Data: data}
	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := make([]*client, 0, len(h.clients))
	for cl := range h.clients {
		clients = append(clients, cl)
	}
	h.mu.RUnlock()

	for _, cl := range clients {
		select {
		case cl.send <- payload:
		default:
			// Slow client: drop message rather than block.
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case cl := <-h.register:
			h.mu.Lock()
			h.clients[cl] = true
			h.mu.Unlock()

		case cl := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[cl]; ok {
				delete(h.clients, cl)
				close(cl.send)
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) writePump(cl *client) {
	defer cl.conn.Close()
	for payload := range cl.send {
		if err := cl.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			h.unregister <- cl
			return
		}
	}
}