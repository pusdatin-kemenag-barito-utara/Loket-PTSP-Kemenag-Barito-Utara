package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/config"
)

func TestR2Service_Upload(t *testing.T) {
	cfg := config.Load()
	if cfg.R2.AccessKeyID == "" || cfg.R2.SecretAccessKey == "" {
		t.Skip("R2 credentials not set, skipping")
	}

	s := NewR2Service(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	testContent := "test r2 upload verification"
	key := "test/verification.txt"

	url, err := s.Upload(ctx, key, strings.NewReader(testContent), int64(len(testContent)), "text/plain")
	if err != nil {
		t.Fatalf("R2 upload failed: %v", err)
	}

	t.Logf("R2 upload succeeded! Public URL: %s", url)

	// Test upload with special characters like '!' (exclamation mark)
	specialKey := "test/verification_special!_test.txt"
	specialURL, err := s.Upload(ctx, specialKey, strings.NewReader(testContent), int64(len(testContent)), "text/plain")
	if err != nil {
		t.Fatalf("R2 upload with special characters failed: %v", err)
	}
	t.Logf("R2 upload with special characters succeeded! Public URL: %s", specialURL)
}

func TestR2Service_GetStream(t *testing.T) {
	cfg := config.Load()
	if cfg.R2.AccessKeyID == "" || cfg.R2.SecretAccessKey == "" {
		t.Skip("R2 credentials not set, skipping")
	}

	s := NewR2Service(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	key := "test/verification.txt"
	resp, err := s.GetStream(ctx, key, "")
	if err != nil {
		t.Fatalf("GetStream failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Fatalf("GetStream expected 200, got %d", resp.StatusCode)
	}

	t.Logf("GetStream succeeded with status %d", resp.StatusCode)

	// Test Byte Range Request
	rangeResp, err := s.GetStream(ctx, key, "bytes=0-10")
	if err != nil {
		t.Fatalf("GetStream with range failed: %v", err)
	}
	defer rangeResp.Body.Close()

	if rangeResp.StatusCode != 206 && rangeResp.StatusCode != 200 {
		t.Fatalf("GetStream expected 206 Partial Content, got %d", rangeResp.StatusCode)
	}
	t.Logf("GetStream with Range succeeded with status %d", rangeResp.StatusCode)
}
