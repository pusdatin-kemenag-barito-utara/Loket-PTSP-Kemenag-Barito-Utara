package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
)

func (s *AuthService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	if s.Turnstile != nil {
		ok, err := s.Turnstile.Verify(ctx, req.Token)
		if err != nil || !ok {
			return nil, errors.New("captcha verification failed")
		}
	}

	user, err := s.Users.FindByUsername(ctx, req.Username)
	if err != nil {
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
	if c.SecretKey == "" {
		// No secret configured: allow (non-production default for local dev).
		return true, nil
	}

	form := url.Values{}
	form.Set("secret", c.SecretKey)
	form.Set("response", token)

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
		Success bool `json:"success"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}
	return result.Success, nil
}