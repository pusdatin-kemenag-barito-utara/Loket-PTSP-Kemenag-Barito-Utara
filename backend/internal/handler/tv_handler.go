package handler

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/realtime"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"github.com/kemenag-baritoutara/loket/internal/service"
)

type TVHandler struct {
	Repo *repository.TVSettingsRepository
	R2   *service.R2Service
	Hub  *realtime.Hub
}

func (h *TVHandler) GetSettings(c fiber.Ctx) error {
	s, err := h.Repo.Get(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memuat pengaturan layar TV",
		})
	}
	return c.JSON(s)
}

func (h *TVHandler) UpdateSettings(c fiber.Ctx) error {
	req := &model.TVSettings{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Format data pengaturan TV tidak valid",
		})
	}

	if err := h.Repo.Save(c.Context(), req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal menyimpan pengaturan layar TV",
		})
	}

	// Broadcast update to all connected TV monitors in real-time
	if h.Hub != nil {
		h.Hub.Broadcast(realtime.EventTVSettingsUpdated, req)
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Pengaturan TV berhasil diperbarui dan disiarkan ke semua layar monitor",
		"data":    req,
	})
}

func (h *TVHandler) UploadMedia(c fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "File media tidak ditemukan dalam form upload",
		})
	}

	// Max 300MB
	if file.Size > 300*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "file_too_large",
			Message: "Ukuran file video maksimal 300MB",
		})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{
		".mp4":  true,
		".webm": true,
		".mov":  true,
		".mkv":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "invalid_type",
			Message: "Hanya format video MP4, WebM, MOV atau gambar JPG/PNG/WebP yang didukung",
		})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "file_open_failed",
			Message: "Gagal membaca file upload",
		})
	}
	defer f.Close()

	// Unique key in R2 bucket with sanitized filename
	var cleanBuilder strings.Builder
	for _, r := range strings.ToLower(file.Filename) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			cleanBuilder.WriteRune(r)
		} else {
			cleanBuilder.WriteRune('_')
		}
	}
	cleanName := cleanBuilder.String()
	for strings.Contains(cleanName, "__") {
		cleanName = strings.ReplaceAll(cleanName, "__", "_")
	}
	cleanName = strings.Trim(cleanName, "_")
	if cleanName == "" || cleanName == ext {
		cleanName = fmt.Sprintf("media%s", ext)
	}
	objectKey := fmt.Sprintf("videos/%d_%s", time.Now().Unix(), cleanName)

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		switch ext {
		case ".mp4":
			contentType = "video/mp4"
		case ".webm":
			contentType = "video/webm"
		}
	}

	publicURL, err := h.R2.Upload(c.Context(), objectKey, f, file.Size, contentType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "r2_upload_failed",
			Message: fmt.Sprintf("Gagal mengunggah ke Cloudflare R2: %v", err),
		})
	}

	streamURL := fmt.Sprintf("/api/v1/media/stream/%s", objectKey)

	return c.JSON(fiber.Map{
		"ok":         true,
		"url":        streamURL,
		"public_url": publicURL,
		"name":       file.Filename,
		"size":       file.Size,
		"key":        objectKey,
	})
}

// UploadChunk receives chunked uploads from frontend to bypass Cloudflare 100MB body limit.
func (h *TVHandler) UploadChunk(c fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Bagian file (chunk) tidak ditemukan dalam form upload",
		})
	}

	uploadID := strings.TrimSpace(c.FormValue("upload_id"))
	if uploadID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "upload_id harus diisi",
		})
	}
	var cleanUploadID strings.Builder
	for _, r := range uploadID {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			cleanUploadID.WriteRune(r)
		}
	}
	uploadID = cleanUploadID.String()
	if uploadID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "upload_id tidak valid",
		})
	}

	chunkIndex, err := strconv.Atoi(c.FormValue("chunk_index"))
	if err != nil || chunkIndex < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "chunk_index tidak valid",
		})
	}

	totalChunks, err := strconv.Atoi(c.FormValue("total_chunks"))
	if err != nil || totalChunks <= 0 || totalChunks > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "total_chunks tidak valid (maksimal 100 bagian)",
		})
	}

	if chunkIndex >= totalChunks {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "chunk_index melebihi total_chunks",
		})
	}

	filename := strings.TrimSpace(c.FormValue("filename"))
	if filename == "" {
		filename = file.Filename
	}

	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{
		".mp4":  true,
		".webm": true,
		".mov":  true,
		".mkv":  true,
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}
	if !allowed[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "invalid_type",
			Message: "Hanya format video MP4, WebM, MOV atau gambar JPG/PNG/WebP yang didukung",
		})
	}

	tempDir := filepath.Join(os.TempDir(), "ptsp_uploads", uploadID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "temp_dir_failed",
			Message: "Gagal menyiapkan direktori penyimpanan sementara",
		})
	}

	chunkPath := filepath.Join(tempDir, fmt.Sprintf("chunk_%04d", chunkIndex))
	if err := c.SaveFile(file, chunkPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "chunk_save_failed",
			Message: fmt.Sprintf("Gagal menyimpan bagian upload %d: %v", chunkIndex, err),
		})
	}

	// If not final chunk, acknowledge reception
	if chunkIndex < totalChunks-1 {
		return c.JSON(fiber.Map{
			"ok":           true,
			"chunk_index":  chunkIndex,
			"total_chunks": totalChunks,
			"completed":    false,
		})
	}

	// Final chunk received! Assemble all chunks sequentially.
	assembledPath := filepath.Join(tempDir, "assembled_media"+ext)
	outFile, err := os.Create(assembledPath)
	if err != nil {
		_ = os.RemoveAll(tempDir)
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "assembly_failed",
			Message: "Gagal membuat file gabungan di server",
		})
	}

	for i := 0; i < totalChunks; i++ {
		partPath := filepath.Join(tempDir, fmt.Sprintf("chunk_%04d", i))
		partFile, err := os.Open(partPath)
		if err != nil {
			outFile.Close()
			_ = os.RemoveAll(tempDir)
			return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
				Error:   "missing_chunk",
				Message: fmt.Sprintf("Bagian upload ke-%d hilang atau belum selesai", i+1),
			})
		}
		_, err = io.Copy(outFile, partFile)
		partFile.Close()
		if err != nil {
			outFile.Close()
			_ = os.RemoveAll(tempDir)
			return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
				Error:   "copy_chunk_failed",
				Message: fmt.Sprintf("Gagal menggabungkan bagian upload ke-%d", i+1),
			})
		}
	}
	outFile.Close()

	assembledStat, err := os.Stat(assembledPath)
	if err != nil || assembledStat.Size() > 300*1024*1024 {
		_ = os.RemoveAll(tempDir)
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "file_too_large",
			Message: "Ukuran total file video melebihi batas 300MB",
		})
	}

	assembledFile, err := os.Open(assembledPath)
	if err != nil {
		_ = os.RemoveAll(tempDir)
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "open_assembled_failed",
			Message: "Gagal membaca file hasil penggabungan",
		})
	}
	defer assembledFile.Close()
	defer os.RemoveAll(tempDir)

	var cleanBuilder strings.Builder
	for _, r := range strings.ToLower(filename) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' || r == '-' || r == '_' {
			cleanBuilder.WriteRune(r)
		} else {
			cleanBuilder.WriteRune('_')
		}
	}
	cleanName := cleanBuilder.String()
	for strings.Contains(cleanName, "__") {
		cleanName = strings.ReplaceAll(cleanName, "__", "_")
	}
	cleanName = strings.Trim(cleanName, "_")
	if cleanName == "" || cleanName == ext {
		cleanName = fmt.Sprintf("media%s", ext)
	}
	objectKey := fmt.Sprintf("videos/%d_%s", time.Now().Unix(), cleanName)

	contentType := c.FormValue("content_type")
	if contentType == "" {
		switch ext {
		case ".mp4":
			contentType = "video/mp4"
		case ".webm":
			contentType = "video/webm"
		case ".mov":
			contentType = "video/quicktime"
		case ".mkv":
			contentType = "video/x-matroska"
		default:
			contentType = "application/octet-stream"
		}
	}

	publicURL, err := h.R2.Upload(c.Context(), objectKey, assembledFile, assembledStat.Size(), contentType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "r2_upload_failed",
			Message: fmt.Sprintf("Gagal mengunggah ke Cloudflare R2: %v", err),
		})
	}

	streamURL := fmt.Sprintf("/api/v1/media/stream/%s", objectKey)

	return c.JSON(fiber.Map{
		"ok":         true,
		"completed":  true,
		"url":        streamURL,
		"public_url": publicURL,
		"name":       filename,
		"size":       assembledStat.Size(),
		"key":        objectKey,
	})
}

// StreamMedia streams media objects directly from Cloudflare R2 via the Go backend,
// completely bypassing ISP DNS blocking (*.r2.dev) and supporting byte range seeking.
func (h *TVHandler) StreamMedia(c fiber.Ctx) error {
	key := c.Params("*")
	if key == "" {
		return c.Status(fiber.StatusBadRequest).SendString("media key required")
	}
	key = strings.TrimPrefix(key, "/")

	rangeHeader := c.Get("Range")
	resp, err := h.R2.GetStream(c.Context(), key, rangeHeader)
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString(fmt.Sprintf("media not found: %v", err))
	}

	c.Status(resp.StatusCode)
	if ct := resp.Header.Get("Content-Type"); ct != "" {
		c.Set("Content-Type", ct)
	} else {
		c.Set("Content-Type", "video/mp4")
	}
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		c.Set("Content-Length", cl)
	}
	if cr := resp.Header.Get("Content-Range"); cr != "" {
		c.Set("Content-Range", cr)
	}
	if ar := resp.Header.Get("Accept-Ranges"); ar != "" {
		c.Set("Accept-Ranges", ar)
	} else {
		c.Set("Accept-Ranges", "bytes")
	}
	c.Set("Cache-Control", "public, max-age=31536000, immutable")

	return c.SendStream(resp.Body, int(resp.ContentLength))
}
