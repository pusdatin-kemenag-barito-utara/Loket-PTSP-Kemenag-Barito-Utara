package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/kemenag-baritoutara/loket/internal/database"
	"github.com/kemenag-baritoutara/loket/internal/model"
)

type TVSettingsRepository struct {
	DB *database.DB
}

func (r *TVSettingsRepository) Get(ctx context.Context) (*model.TVSettings, error) {
	var s model.TVSettings
	err := r.DB.GetContext(ctx, &s, `
		SELECT id, playback_mode, single_mode, video_id, running_text, custom_maklumat, office_address, playlist::text as playlist, COALESCE(theme, 'light') as theme, updated_at
		FROM kemenag_loket.tv_settings
		WHERE id = 'default'
		LIMIT 1`)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.TVSettings{
				ID:           "default",
				PlaybackMode: "playlist",
				SingleMode:   "info",
				Playlist:     "[]",
				Theme:        "light",
			}, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *TVSettingsRepository) Save(ctx context.Context, s *model.TVSettings) error {
	if s.Playlist == "" {
		s.Playlist = "[]"
	}
	if s.Theme == "" {
		s.Theme = "light"
	}
	_, err := r.DB.ExecContext(ctx, `
		INSERT INTO kemenag_loket.tv_settings (id, playback_mode, single_mode, video_id, running_text, custom_maklumat, office_address, playlist, theme, updated_at)
		VALUES ('default', $1, $2, $3, $4, $5, $6, $7::jsonb, $8, now())
		ON CONFLICT (id) DO UPDATE SET
			playback_mode = EXCLUDED.playback_mode,
			single_mode = EXCLUDED.single_mode,
			video_id = EXCLUDED.video_id,
			running_text = EXCLUDED.running_text,
			custom_maklumat = EXCLUDED.custom_maklumat,
			office_address = EXCLUDED.office_address,
			playlist = EXCLUDED.playlist,
			theme = EXCLUDED.theme,
			updated_at = now()`,
		s.PlaybackMode, s.SingleMode, s.VideoID, s.RunningText, s.CustomMaklumat, s.OfficeAddress, s.Playlist, s.Theme,
	)
	return err
}
