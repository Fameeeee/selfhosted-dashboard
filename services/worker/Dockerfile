# ---- build stage ----
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /scanner-worker ./main.go

# ---- runtime stage ----
FROM alpine:3.20

# Install gitleaks and git (needed for cloning)
RUN apk add --no-cache git && \
    GITLEAKS_VERSION=8.21.2 && \
    wget -qO- "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
    | tar -xz -C /usr/local/bin gitleaks && \
    chmod +x /usr/local/bin/gitleaks

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /scanner-worker /scanner-worker

ENTRYPOINT ["/scanner-worker"]
