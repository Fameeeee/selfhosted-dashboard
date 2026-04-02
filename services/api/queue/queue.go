package queue

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

// Job represents a GitHub webhook event to be processed.
type Job struct {
	Event      string          `json:"event"`
	DeliveryID string          `json:"delivery_id"`
	Payload    json.RawMessage `json:"payload"`
}

// Queue is the interface for enqueuing webhook jobs.
type Queue interface {
	Enqueue(ctx context.Context, job Job) error
}

// RedisQueue pushes jobs onto a Redis list using RPUSH (FIFO with LPOP consumers).
type RedisQueue struct {
	client *redis.Client
	key    string
}

func NewRedisQueue(client *redis.Client, key string) *RedisQueue {
	return &RedisQueue{client: client, key: key}
}

func (q *RedisQueue) Enqueue(ctx context.Context, job Job) error {
	data, err := json.Marshal(job)
	if err != nil {
		return err
	}
	return q.client.RPush(ctx, q.key, data).Err()
}
