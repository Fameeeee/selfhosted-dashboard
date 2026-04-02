package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/selfhosted-dashboard/api/queue"
)

const maxBodyBytes = 25 * 1024 * 1024 // 25 MB (GitHub's max payload)

// ValidateSignature checks the X-Hub-Signature-256 header against the payload.
func ValidateSignature(secret, signature string, body []byte) bool {
	if !strings.HasPrefix(signature, "sha256=") {
		return false
	}
	got, err := hex.DecodeString(strings.TrimPrefix(signature, "sha256="))
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	expected := mac.Sum(nil)
	return hmac.Equal(got, expected)
}

// Webhook returns an http.HandlerFunc that validates GitHub webhook requests
// and enqueues them for processing.
func Webhook(secret string, q queue.Queue, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sig := r.Header.Get("X-Hub-Signature-256")
		if sig == "" {
			http.Error(w, "missing signature", http.StatusUnauthorized)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}

		if !ValidateSignature(secret, sig, body) {
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}

		event := r.Header.Get("X-GitHub-Event")
		deliveryID := r.Header.Get("X-GitHub-Delivery")

		job := queue.Job{
			Event:      event,
			DeliveryID: deliveryID,
			Payload:    body,
		}

		if err := q.Enqueue(r.Context(), job); err != nil {
			logger.Error("failed to enqueue job", "delivery_id", deliveryID, "error", err)
			http.Error(w, "failed to enqueue job", http.StatusInternalServerError)
			return
		}

		logger.Info("webhook enqueued", "event", event, "delivery_id", deliveryID)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_, _ = fmt.Fprintf(w, `{"status":"queued","delivery_id":%q}`, deliveryID)
	}
}
