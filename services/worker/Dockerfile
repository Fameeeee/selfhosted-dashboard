# ---- build gitleaks from source ----
FROM golang:1.25-alpine AS gitleaks-builder

RUN apk add --no-cache git

ARG GITLEAKS_VERSION=8.30.1
RUN git clone --depth 1 --branch v${GITLEAKS_VERSION} https://github.com/gitleaks/gitleaks.git /gitleaks
WORKDIR /gitleaks
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /usr/local/bin/gitleaks .

# ---- build stage ----
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /scanner-worker ./main.go

# ---- runtime stage ----
FROM alpine:3.20

# Install git (needed for cloning)
RUN apk add --no-cache git

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=gitleaks-builder /usr/local/bin/gitleaks /usr/local/bin/gitleaks
COPY --from=builder /scanner-worker /scanner-worker

ENTRYPOINT ["/scanner-worker"]
