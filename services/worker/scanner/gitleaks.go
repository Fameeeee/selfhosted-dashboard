package scanner

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// Finding represents a single secret detected by gitleaks.
type Finding struct {
	RuleID      string `json:"RuleID"`
	Description string `json:"Description"`
	File        string `json:"File"`
	Line        int    `json:"StartLine"`
	Commit      string `json:"Commit"`
	Secret      string `json:"Secret"` // redacted before storage
}

// Result is returned after scanning a repository.
type Result struct {
	RepoURL  string    `json:"repo_url"`
	Findings []Finding `json:"findings"`
}

// Scanner wraps the gitleaks CLI binary.
type Scanner struct {
	// BinaryPath is the path to the gitleaks executable.
	// Defaults to "gitleaks" (resolved via PATH).
	BinaryPath string
}

func New() *Scanner {
	return &Scanner{BinaryPath: "gitleaks"}
}

// Scan clones repoURL into a temp dir and runs gitleaks detect on it.
// The caller is responsible for ensuring gitleaks is installed.
func (s *Scanner) Scan(ctx context.Context, repoURL string) (*Result, error) {
	dir, err := os.MkdirTemp("", "gitleaks-*")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(dir)

	if err := cloneRepo(ctx, repoURL, dir); err != nil {
		return nil, fmt.Errorf("clone %s: %w", repoURL, err)
	}

	reportFile := filepath.Join(dir, "report.json")
	args := []string{
		"detect",
		"--source", dir,
		"--report-format", "json",
		"--report-path", reportFile,
		"--no-git", // already cloned; avoids re-fetching
		"--exit-code", "0", // don't fail the process on findings
	}

	cmd := exec.CommandContext(ctx, s.BinaryPath, args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("gitleaks: %w\n%s", err, out)
	}

	data, err := os.ReadFile(reportFile)
	if err != nil {
		// No report file means no findings.
		return &Result{RepoURL: repoURL, Findings: []Finding{}}, nil
	}

	var findings []Finding
	if err := json.Unmarshal(data, &findings); err != nil {
		return nil, fmt.Errorf("parse report: %w", err)
	}

	// Redact secrets before returning so they are never stored in plain text.
	for i := range findings {
		findings[i].Secret = "[REDACTED]"
	}

	return &Result{RepoURL: repoURL, Findings: findings}, nil
}

func cloneRepo(ctx context.Context, repoURL, dest string) error {
	cmd := exec.CommandContext(ctx, "git", "clone", "--depth=1", repoURL, dest)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%w\n%s", err, out)
	}
	return nil
}
