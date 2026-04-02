package handlers

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/selfhosted-dashboard/api/queue"
)

// --- ValidateSignature unit tests ---

func TestValidateSignature(t *testing.T) {
	secret := "test-secret"
	body := []byte(`{"action":"opened"}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	validSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	tests := []struct {
		name      string
		secret    string
		signature string
		body      []byte
		want      bool
	}{
		{
			name:      "valid signature",
			secret:    secret,
			signature: validSig,
			body:      body,
			want:      true,
		},
		{
			name:      "wrong secret",
			secret:    "wrong-secret",
			signature: validSig,
			body:      body,
			want:      false,
		},
		{
			name:      "tampered body",
			secret:    secret,
			signature: validSig,
			body:      []byte(`{"action":"closed"}`),
			want:      false,
		},
		{
			name:      "missing sha256 prefix",
			secret:    secret,
			signature: hex.EncodeToString(mac.Sum(nil)),
			body:      body,
			want:      false,
		},
		{
			name:      "empty signature",
			secret:    secret,
			signature: "",
			body:      body,
			want:      false,
		},
		{
			name:      "invalid hex in signature",
			secret:    secret,
			signature: "sha256=notvalidhex!!",
			body:      body,
			want:      false,
		},
		{
			name:      "empty body valid signature",
			secret:    secret,
			signature: sign(secret, []byte{}),
			body:      []byte{},
			want:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateSignature(tt.secret, tt.signature, tt.body)
			if got != tt.want {
				t.Errorf("ValidateSignature() = %v, want %v", got, tt.want)
			}
		})
	}
}

// --- Webhook handler integration tests ---

type mockQueue struct {
	jobs []queue.Job
	err  error
}

func (m *mockQueue) Enqueue(_ context.Context, j queue.Job) error {
	if m.err != nil {
		return m.err
	}
	m.jobs = append(m.jobs, j)
	return nil
}

func TestWebhookHandler(t *testing.T) {
	secret := "handler-secret"
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	body := []byte(`{"action":"opened","number":1}`)

	newRequest := func(body []byte, sig, event, delivery string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/webhook", bytes.NewReader(body))
		if sig != "" {
			req.Header.Set("X-Hub-Signature-256", sig)
		}
		req.Header.Set("X-GitHub-Event", event)
		req.Header.Set("X-GitHub-Delivery", delivery)
		return req
	}

	t.Run("valid request enqueues job and returns 202", func(t *testing.T) {
		q := &mockQueue{}
		w := httptest.NewRecorder()
		req := newRequest(body, sign(secret, body), "pull_request", "abc-123")

		Webhook(secret, q, logger)(w, req)

		if w.Code != http.StatusAccepted {
			t.Errorf("status = %d, want %d", w.Code, http.StatusAccepted)
		}
		if len(q.jobs) != 1 {
			t.Fatalf("expected 1 job enqueued, got %d", len(q.jobs))
		}
		if q.jobs[0].Event != "pull_request" {
			t.Errorf("job event = %q, want %q", q.jobs[0].Event, "pull_request")
		}
		if q.jobs[0].DeliveryID != "abc-123" {
			t.Errorf("job delivery_id = %q, want %q", q.jobs[0].DeliveryID, "abc-123")
		}

		var resp map[string]string
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("could not decode response: %v", err)
		}
		if resp["status"] != "queued" {
			t.Errorf("response status = %q, want %q", resp["status"], "queued")
		}
	})

	t.Run("missing signature returns 401", func(t *testing.T) {
		q := &mockQueue{}
		w := httptest.NewRecorder()
		req := newRequest(body, "", "push", "xyz")

		Webhook(secret, q, logger)(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
		if len(q.jobs) != 0 {
			t.Error("expected no jobs enqueued")
		}
	})

	t.Run("wrong signature returns 401", func(t *testing.T) {
		q := &mockQueue{}
		w := httptest.NewRecorder()
		req := newRequest(body, sign("wrong-secret", body), "push", "xyz")

		Webhook(secret, q, logger)(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want %d", w.Code, http.StatusUnauthorized)
		}
	})

	t.Run("queue error returns 500", func(t *testing.T) {
		q := &mockQueue{err: fmt.Errorf("redis unavailable")}
		w := httptest.NewRecorder()
		req := newRequest(body, sign(secret, body), "push", "xyz")

		Webhook(secret, q, logger)(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Errorf("status = %d, want %d", w.Code, http.StatusInternalServerError)
		}
	})
}

// sign is a test helper that produces a valid X-Hub-Signature-256 value.
func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
