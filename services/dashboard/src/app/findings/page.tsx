"use client";

import { useEffect, useState } from "react";

interface Finding {
  id: number;
  scan_id: number;
  rule_id: string;
  description: string;
  file_path: string;
  line_number: number;
  commit_sha: string;
  created_at: string;
  repo_url: string;
}

function repoName(url: string) {
  return url.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
}

function shortSha(sha: string) {
  return sha?.slice(0, 7) ?? "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ruleFilter, setRuleFilter] = useState("all");

  useEffect(() => {
    fetch("/api/findings")
      .then((r) => r.json())
      .then((data) => {
        setFindings(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const rules = ["all", ...Array.from(new Set(findings.map((f) => f.rule_id))).sort()];

  const filtered = findings.filter((f) => {
    const matchSearch =
      repoName(f.repo_url).toLowerCase().includes(search.toLowerCase()) ||
      f.file_path.toLowerCase().includes(search.toLowerCase()) ||
      f.rule_id.toLowerCase().includes(search.toLowerCase());
    const matchRule = ruleFilter === "all" || f.rule_id === ruleFilter;
    return matchSearch && matchRule;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Findings</h1>
        <p className="mt-1 text-sm text-slate-500">
          All detected secrets across scanned repositories
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm w-72">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search repo, file, rule…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </div>

        <select
          value={ruleFilter}
          onChange={(e) => setRuleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {rules.map((r) => (
            <option key={r} value={r}>
              {r === "all" ? "All rules" : r}
            </option>
          ))}
        </select>

        {(search || ruleFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setRuleFilter("all"); }}
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} of {findings.length} findings
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rule
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Repository
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                File
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 text-center">
                Line
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Commit
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detected
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  {search || ruleFilter !== "all"
                    ? "No findings match your filters"
                    : "No findings yet — great news!"}
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap">
                      {f.rule_id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 max-w-48 truncate">
                    {f.description || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-700 max-w-40 truncate font-medium">
                    {repoName(f.repo_url)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600 max-w-52 truncate">
                    {f.file_path}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-500">
                    {f.line_number || "—"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                    {shortSha(f.commit_sha)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(f.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
