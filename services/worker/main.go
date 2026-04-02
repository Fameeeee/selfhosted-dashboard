package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/selfhosted-dashboard/worker/scanner"
)

const defaultQueueKey = "webhook_jobs"

type job struct {
	Event      string          `json:"event"`
	DeliveryID string          `json:"delivery_id"`
	Payload    json.RawMessage `json:"payload"`
}

type pushPayload struct {
	Repository struct {
		CloneURL string `json:"clone_url"`
	} `json:"repository"`
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.Error("invalid REDIS_URL", "error", err)
		os.Exit(1)
	}

	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pingCtx, pingCancel := context.WithTimeout(ctx, 5*time.Second)
	defer pingCancel()
	if err := rdb.Ping(pingCtx).Err(); err != nil {
		logger.Error("failed to connect to Redis", "error", err)
		os.Exit(1)
	}

	workers := 4
	if w := os.Getenv("WORKERS"); w != "" {
		if n, err := strconv.Atoi(w); err == nil && n > 0 {
			workers = n
		}
	}

	sc := scanner.New()
	jobs := make(chan job, workers*2)

	// Start worker pool.
	for i := 0; i < workers; i++ {
		go func() {
			for j := range jobs {
				process(ctx, j, sc, logger)
			}
		}()
	}

	// Dequeue loop.
	go func() {
		queueKey := defaultQueueKey
		if k := os.Getenv("QUEUE_KEY"); k != "" {
			queueKey = k
		}
		logger.Info("worker started", "workers", workers, "queue", queueKey)
		for {
			res, err := rdb.BLPop(ctx, 5*time.Second, queueKey).Result()
			if err == redis.Nil {
				continue
			}
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				logger.Error("redis BLPop error", "error", err)
				time.Sleep(time.Second)
				continue
			}
			var j job
			if err := json.Unmarshal([]byte(res[1]), &j); err != nil {
				logger.Error("failed to unmarshal job", "error", err)
				continue
			}
			jobs <- j
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down worker")
	cancel()
	close(jobs)
}

func process(ctx context.Context, j job, sc *scanner.Scanner, logger *slog.Logger) {
	log := logger.With("event", j.Event, "delivery_id", j.DeliveryID)

	// Only scan push events — other events are acknowledged and dropped.
	if j.Event != "push" {
		log.Info("skipping non-push event")
		return
	}

	var p pushPayload
	if err := json.Unmarshal(j.Payload, &p); err != nil {
		log.Error("failed to parse push payload", "error", err)
		return
	}

	cloneURL := p.Repository.CloneURL
	if cloneURL == "" {
		log.Error("push payload missing repository.clone_url")
		return
	}

	log.Info("scanning repository", "clone_url", cloneURL)
	result, err := sc.Scan(ctx, cloneURL)
	if err != nil {
		log.Error("scan failed", "error", err)
		return
	}

	if len(result.Findings) == 0 {
		log.Info("scan complete — no findings")
		return
	}

	log.Warn("scan complete — secrets detected", "count", len(result.Findings))
	for _, f := range result.Findings {
		log.Warn("finding",
			"rule", f.RuleID,
			"file", f.File,
			"line", f.Line,
			"commit", f.Commit,
		)
	}
}
