# ---- build stage ----
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Cache module downloads separately from source
COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /webhook-api ./main.go

# ---- runtime stage ----
FROM scratch

# Import CA certificates for TLS (Redis TLS, etc.)
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /webhook-api /webhook-api

# Non-root user (uid/gid 65532 — "nonroot" in distroless convention)
USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/webhook-api"]
