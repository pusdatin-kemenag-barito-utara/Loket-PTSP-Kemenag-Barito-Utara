package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kemenag-baritoutara/loket/internal/config"
	"github.com/kemenag-baritoutara/loket/internal/model"
	"github.com/kemenag-baritoutara/loket/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

const TokenCookieName = "loket_token"

type Claims struct {
	UserID   string `json:"uid"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Name     string `json:"name"`
	jwt.RegisteredClaims
}

type AuthService struct {
	Users     *repository.UserRepository
	Cfg       *config.Config
	Turnstile *TurnstileClient
}

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid or expired token")
	dummyPasswordHash, _  = bcrypt.GenerateFromPassword([]byte("guard-against-timing-attacks-kemenag"), bcrypt.DefaultCost)
)

func (s *AuthService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	if s.Turnstile != nil && s.Turnstile.SecretKey != "" {
		if strings.TrimSpace(req.Token) == "" {
			return nil, errors.New("harap selesaikan verifikasi captcha terlebih dahulu")
		}
		ok, err := s.Turnstile.Verify(ctx, req.Token)
		if err != nil || !ok {
			if err != nil {
				return nil, err
			}
			return nil, errors.New("verifikasi captcha Cloudflare tidak valid atau sesi captcha kedaluwarsa, silakan muat ulang captcha")
		}
	}

	user, err := s.Users.FindByUsername(ctx, req.Username)
	if err != nil {
		// Run dummy comparison to mitigate timing-based username enumeration
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash, []byte(req.Password))
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	tokenStr, err := s.IssueToken(user)
	if err != nil {
		return nil, err
	}

	return &model.LoginResponse{
		Token: tokenStr,
		User:  *user,
	}, nil
}

func (s *AuthService) IssueToken(u *model.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   u.ID,
		Username: u.Username,
		Role:     string(u.Role),
		Name:     u.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.Cfg.JWT.TTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.Cfg.JWT.Secret))
}

func (s *AuthService) ParseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.Cfg.JWT.Secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

type TurnstileClient struct {
	SecretKey  string
	SiteKey    string
	HTTPClient *http.Client
}

func NewTurnstileClient(secretKey, siteKey string) *TurnstileClient {
	return &TurnstileClient{
		SecretKey:  secretKey,
		SiteKey:    siteKey,
		HTTPClient: &http.Client{Timeout: 5 * time.Second},
	}
}

// Verify calls Cloudflare Turnstile siteverify endpoint.
func (c *TurnstileClient) Verify(ctx context.Context, token string) (bool, error) {
	secret := strings.TrimSpace(c.SecretKey)
	if secret == "" {
		// No secret configured: allow (non-production default for local dev).
		return true, nil
	}

	respToken := strings.TrimSpace(token)
	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", respToken)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		bytes.NewBufferString(form.Encode()))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return false, err
	}

	var result struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}
	if !result.Success {
		log.Printf("[Turnstile] Verification failed: sitekey=%s, success=%v, error-codes=%v, response=%s",
			c.SiteKey, result.Success, result.ErrorCodes, string(body))
		if len(result.ErrorCodes) > 0 {
			codeStr := strings.Join(result.ErrorCodes, ", ")
			if strings.Contains(codeStr, "timeout-or-duplicate") {
				return false, errors.New("sesi verifikasi captcha kedaluwarsa atau sudah pernah digunakan, silakan centang ulang")
			}
			return false, fmt.Errorf("verifikasi captcha Cloudflare gagal (%s)", codeStr)
		}
		return false, errors.New("verifikasi captcha Cloudflare tidak valid")
	}
	return true, nil
}