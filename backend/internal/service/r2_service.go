package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/loket/internal/config"
)

type R2Service struct {
	cfg *config.Config
}

func NewR2Service(cfg *config.Config) *R2Service {
	return &R2Service{cfg: cfg}
}

// Upload uploads any media stream (MP4, WebM, image) directly to Cloudflare R2 bucket
// using AWS S3 Signature Version 4 protocol.
func (s *R2Service) Upload(ctx context.Context, key string, body io.Reader, size int64, contentType string) (string, error) {
	if s.cfg.R2.AccountID == "" || s.cfg.R2.AccessKeyID == "" || s.cfg.R2.SecretAccessKey == "" {
		return "", fmt.Errorf("R2 credentials not configured")
	}

	bucket := s.cfg.R2.Bucket
	if bucket == "" {
		bucket = "loket-ptsp"
	}

	endpoint := s.cfg.R2.EndpointURL
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", s.cfg.R2.AccountID)
	}

	u, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid R2 endpoint URL: %w", err)
	}

	// Clean object key and encode path strictly per RFC 3986 for AWS SigV4
	key = strings.TrimPrefix(key, "/")
	encodedKey := uriEncode(key, false)
	encodedPath := fmt.Sprintf("/%s/%s", bucket, encodedKey)
	targetURL := fmt.Sprintf("%s%s", endpoint, encodedPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, targetURL, body)
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	if contentType == "" {
		contentType = "application/octet-stream"
	}
	req.Header.Set("Content-Type", contentType)
	req.ContentLength = size

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	req.Header.Set("x-amz-date", amzDate)
	// For streaming / unknown size or large file uploads, AWS SigV4 supports UNSIGNED-PAYLOAD
	req.Header.Set("x-amz-content-sha256", "UNSIGNED-PAYLOAD")

	host := u.Host
	req.Header.Set("Host", host)

	// Build Canonical Request
	// Signed headers: content-type;host;x-amz-content-sha256;x-amz-date
	canonicalHeaders := fmt.Sprintf("content-type:%s\nhost:%s\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:%s\n",
		contentType, host, amzDate)
	signedHeaders := "content-type;host;x-amz-content-sha256;x-amz-date"

	canonicalReq := fmt.Sprintf("%s\n%s\n\n%s\n%s\nUNSIGNED-PAYLOAD",
		http.MethodPut,
		encodedPath,
		canonicalHeaders,
		signedHeaders,
	)

	h := sha256.New()
	h.Write([]byte(canonicalReq))
	hashedCanonicalReq := hex.EncodeToString(h.Sum(nil))

	region := "auto"
	service := "s3"
	credentialScope := fmt.Sprintf("%s/%s/%s/aws4_request", dateStamp, region, service)
	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s\n%s", amzDate, credentialScope, hashedCanonicalReq)

	signingKey := getSignatureKey(s.cfg.R2.SecretAccessKey, dateStamp, region, service)
	signature := hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.cfg.R2.AccessKeyID,
		credentialScope,
		signedHeaders,
		signature,
	)
	req.Header.Set("Authorization", authHeader)

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("R2 upload network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("R2 upload returned status %d: %s", resp.StatusCode, string(respBody))
	}

	publicURL := strings.TrimSuffix(s.cfg.R2.PublicURL, "/")
	if publicURL == "" {
		publicURL = "https://pub-8f045be228ce4782863b2a6928a4957c.r2.dev"
	}
	return fmt.Sprintf("%s/%s", publicURL, encodedKey), nil
}

// GetStream fetches an object stream from Cloudflare R2 using AWS SigV4, supporting byte ranges.
func (s *R2Service) GetStream(ctx context.Context, key string, rangeHeader string) (*http.Response, error) {
	if s.cfg.R2.AccountID == "" || s.cfg.R2.AccessKeyID == "" || s.cfg.R2.SecretAccessKey == "" {
		return nil, fmt.Errorf("R2 credentials not configured")
	}

	bucket := s.cfg.R2.Bucket
	if bucket == "" {
		bucket = "loket-ptsp"
	}

	endpoint := s.cfg.R2.EndpointURL
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", s.cfg.R2.AccountID)
	}

	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, fmt.Errorf("invalid R2 endpoint URL: %w", err)
	}

	key = strings.TrimPrefix(key, "/")
	encodedKey := uriEncode(key, false)
	encodedPath := fmt.Sprintf("/%s/%s", bucket, encodedKey)
	targetURL := fmt.Sprintf("%s%s", endpoint, encodedPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create get request: %w", err)
	}

	if rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", "UNSIGNED-PAYLOAD")

	host := u.Host
	req.Header.Set("Host", host)

	// Build Canonical Request
	var canonicalHeaders string
	var signedHeaders string
	if rangeHeader != "" {
		canonicalHeaders = fmt.Sprintf("host:%s\nrange:%s\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:%s\n",
			host, rangeHeader, amzDate)
		signedHeaders = "host;range;x-amz-content-sha256;x-amz-date"
	} else {
		canonicalHeaders = fmt.Sprintf("host:%s\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:%s\n",
			host, amzDate)
		signedHeaders = "host;x-amz-content-sha256;x-amz-date"
	}

	canonicalReq := fmt.Sprintf("%s\n%s\n\n%s\n%s\nUNSIGNED-PAYLOAD",
		http.MethodGet,
		encodedPath,
		canonicalHeaders,
		signedHeaders,
	)

	h := sha256.New()
	h.Write([]byte(canonicalReq))
	hashedCanonicalReq := hex.EncodeToString(h.Sum(nil))

	region := "auto"
	service := "s3"
	credentialScope := fmt.Sprintf("%s/%s/%s/aws4_request", dateStamp, region, service)
	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s\n%s", amzDate, credentialScope, hashedCanonicalReq)

	signingKey := getSignatureKey(s.cfg.R2.SecretAccessKey, dateStamp, region, service)
	signature := hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.cfg.R2.AccessKeyID,
		credentialScope,
		signedHeaders,
		signature,
	)
	req.Header.Set("Authorization", authHeader)

	client := &http.Client{Timeout: 30 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("R2 get network error: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("R2 get returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return resp, nil
}

func hmacSHA256(key, data []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}

func getSignatureKey(secret, dateStamp, regionName, serviceName string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secret), []byte(dateStamp))
	kRegion := hmacSHA256(kDate, []byte(regionName))
	kService := hmacSHA256(kRegion, []byte(serviceName))
	kSigning := hmacSHA256(kService, []byte("aws4_request"))
	return kSigning
}

// uriEncode encodes strings according to RFC 3986 as required by AWS SigV4.
// Unreserved characters: [A-Za-z0-9-_.~]. Everything else is percent-encoded.
// When encodeSlash is false, '/' is preserved as a path separator.
func uriEncode(s string, encodeSlash bool) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '~' || c == '.' {
			b.WriteByte(c)
		} else if c == '/' && !encodeSlash {
			b.WriteByte('/')
		} else {
			fmt.Fprintf(&b, "%%%02X", c)
		}
	}
	return b.String()
}
