-- golang-migrate: run with `migrate -path ./migrations -database $DATABASE_URL up`

CREATE TABLE IF NOT EXISTS scans (
    id          BIGSERIAL PRIMARY KEY,
    delivery_id TEXT        NOT NULL,
    repo_url    TEXT        NOT NULL,
    event       TEXT        NOT NULL,
    scanned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS findings (
    id          BIGSERIAL PRIMARY KEY,
    scan_id     BIGINT      NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    rule_id     TEXT        NOT NULL,
    description TEXT        NOT NULL,
    file_path   TEXT        NOT NULL,
    line_number INT         NOT NULL,
    commit_sha  TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_scan_id   ON findings(scan_id);
CREATE INDEX idx_scans_repo_url     ON scans(repo_url);
CREATE INDEX idx_scans_scanned_at   ON scans(scanned_at DESC);
