package handler

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/loket/internal/middleware"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	Users *repository.UserRepository
}

type CreateUserRequest struct {
	Username string     `json:"username"`
	Password string     `json:"password"`
	Name     string     `json:"name"`
	Role     model.Role `json:"role"`
}

type UpdateUserRequest struct {
	Username string     `json:"username"`
	Password string     `json:"password"`
	Name     string     `json:"name"`
	Role     model.Role `json:"role"`
}

func (h *UserHandler) List(c fiber.Ctx) error {
	users, err := h.Users.List(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal mengambil daftar pengguna",
		})
	}
	return c.JSON(users)
}

func (h *UserHandler) Create(c fiber.Ctx) error {
	req := &CreateUserRequest{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Data masukan tidak valid",
		})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Name = strings.TrimSpace(req.Name)
	if req.Username == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "validation_error",
			Message: "Nama, username, dan password wajib diisi",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "validation_error",
			Message: "Password minimal 6 karakter",
		})
	}

	taken, err := h.Users.IsUsernameTaken(c.Context(), req.Username, "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memeriksa keunikan username",
		})
	}
	if taken {
		return c.Status(fiber.StatusConflict).JSON(model.ErrorResponse{
			Error:   "username_taken",
			Message: "Username atau email sudah digunakan",
		})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "hash_error",
			Message: "Gagal memproses password",
		})
	}

	role := req.Role
	if role == "" {
		role = model.RoleAdmin
	}

	newUser := &model.User{
		Username:     req.Username,
		PasswordHash: string(hash),
		Name:         req.Name,
		Role:         role,
	}

	if err := h.Users.Create(c.Context(), newUser); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal menambahkan pengguna ke database",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(newUser)
}

func (h *UserHandler) Update(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "ID pengguna diperlukan",
		})
	}

	req := &UpdateUserRequest{}
	if err := c.Bind().Body(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "Data masukan tidak valid",
		})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Name = strings.TrimSpace(req.Name)
	if req.Username == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "validation_error",
			Message: "Nama dan username wajib diisi",
		})
	}

	taken, err := h.Users.IsUsernameTaken(c.Context(), req.Username, id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memeriksa keunikan username",
		})
	}
	if taken {
		return c.Status(fiber.StatusConflict).JSON(model.ErrorResponse{
			Error:   "username_taken",
			Message: "Username atau email sudah digunakan oleh akun lain",
		})
	}

	var passwordHash string
	if req.Password != "" {
		if len(req.Password) < 6 {
			return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
				Error:   "validation_error",
				Message: "Password baru minimal 6 karakter",
			})
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
				Error:   "hash_error",
				Message: "Gagal memproses password baru",
			})
		}
		passwordHash = string(hash)
	}

	role := req.Role
	if role == "" {
		role = model.RoleAdmin
	}

	updated, err := h.Users.Update(c.Context(), id, req.Username, req.Name, string(role), passwordHash)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal memperbarui pengguna",
		})
	}

	return c.JSON(updated)
}

func (h *UserHandler) Delete(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(model.ErrorResponse{
			Error:   "bad_request",
			Message: "ID pengguna diperlukan",
		})
	}

	claims := middleware.UserFromCtx(c)
	if claims != nil && claims.UserID == id {
		return c.Status(fiber.StatusForbidden).JSON(model.ErrorResponse{
			Error:   "forbidden",
			Message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif",
		})
	}

	if err := h.Users.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(model.ErrorResponse{
			Error:   "database_error",
			Message: "Gagal menghapus pengguna dari database",
		})
	}

	return c.JSON(fiber.Map{
		"ok":      true,
		"message": "Pengguna berhasil dihapus",
	})
}
