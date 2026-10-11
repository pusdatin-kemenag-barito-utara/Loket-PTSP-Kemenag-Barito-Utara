package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type TVSettingsRepository struct {
	DB *database.DB
}

type pbTVRecord struct {
	ID             string          `json:"id"`
	PlaybackMode   string          `json:"playback_mode"`
	SingleMode     string          `json:"single_mode"`
	VideoID        string          `json:"video_id"`
	RunningText    string          `json:"running_text"`
	CustomMaklumat string          `json:"custom_maklumat"`
	OfficeAddress  string          `json:"office_address"`
	Playlist       json.RawMessage `json:"playlist"`
	Theme          string          `json:"theme"`
	UpdatedAt      string          `json:"updated_at"`
	Updated        string          `json:"updated"`
}

func (r *TVSettingsRepository) Get(ctx context.Context) (*model.TVSettings, error) {
	var rec pbTVRecord
	err := r.DB.Get(ctx, "tv_settings", "default", &rec)
	if err != nil {
		return &model.TVSettings{
			ID:           "default",
			PlaybackMode: "playlist",
			SingleMode:   "info",
			Playlist:     "[]",
			Theme:        "light",
		}, nil
	}

	playlistStr := string(rec.Playlist)
	if playlistStr == "" || playlistStr == "null" {
		playlistStr = "[]"
	}
	theme := rec.Theme
	if theme == "" {
		theme = "light"
	}

	return &model.TVSettings{
		ID:             rec.ID,
		PlaybackMode:   rec.PlaybackMode,
		SingleMode:     rec.SingleMode,
		VideoID:        rec.VideoID,
		RunningText:    rec.RunningText,
		CustomMaklumat: rec.CustomMaklumat,
		OfficeAddress:  rec.OfficeAddress,
		Playlist:       playlistStr,
		Theme:          theme,
		UpdatedAt:      parseTime(rec.UpdatedAt, rec.Updated),
	}, nil
}

func (r *TVSettingsRepository) Save(ctx context.Context, s *model.TVSettings) error {
	if s.Playlist == "" {
		s.Playlist = "[]"
	}
	if s.Theme == "" {
		s.Theme = "light"
	}

	var playlistRaw any
	if err := json.Unmarshal([]byte(s.Playlist), &playlistRaw); err != nil {
		playlistRaw = []any{}
	}

	payload := map[string]any{
		"playback_mode":   s.PlaybackMode,
		"single_mode":     s.SingleMode,
		"video_id":        s.VideoID,
		"running_text":    s.RunningText,
		"custom_maklumat": s.CustomMaklumat,
		"office_address":  s.OfficeAddress,
		"playlist":        playlistRaw,
		"theme":           s.Theme,
		"updated_at":      time.Now().Format(time.RFC3339),
	}

	var existing pbTVRecord
	err := r.DB.Get(ctx, "tv_settings", "default", &existing)
	if err != nil {
		payload["id"] = "default"
		return r.DB.Create(ctx, "tv_settings", payload, nil)
	}

	return r.DB.Update(ctx, "tv_settings", "default", payload, nil)
}
