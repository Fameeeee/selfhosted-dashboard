"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalScans: number;
  totalFindings: number;
  reposScanned: number;
  scansLast24h: number;
}

interface Scan {
  id: number;
  delivery_id: string;
  repo_url: string;
  event: string;
  scanned_at: string;
  findings_count: number;
}

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

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function repoName(url: string) {
  return url.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
}

function shortSha(sha: string) {
  return sha?.slice(0, 7) ?? "—";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/scans").then((r) => r.json()),
      fetch("/api/findings").then((r) => r.json()),
    ]).then(([s, sc, f]) => {
      setStats(s);
      setScans(Array.isArray(sc) ? sc.slice(0, 5) : []);
      setFindings(Array.isArray(f) ? f.slice(0, 8) : []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Secret scanning activity across all repositories
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Scans"
          value={loading ? "—" : (stats?.totalScans ?? 0)}
          accent="text-slate-900"
        />
        <StatCard
          label="Total Findings"
          value={loading ? "—" : (stats?.totalFindings ?? 0)}
          sub="Secrets detected"
          accent="text-red-600"
        />
        <StatCard
          label="Repos Scanned"
          value={loading ? "—" : (stats?.reposScanned ?? 0)}
          accent="text-indigo-600"
        />
        <StatCard
          label="Scans (24h)"
          value={loading ? "—" : (stats?.scansLast24h ?? 0)}
          sub="Last 24 hours"
          accent="text-emerald-600"
        />
      </div>

      {/* Recent scans */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Scans
          </h2>
          <Link
            href="/scans"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Repository
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Event
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Findings
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scanned
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                    No scans yet
                  </td>
                </tr>
              ) : (
                scans.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                      {repoName(s.repo_url)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {s.event}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          s.findings_count > 0
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {s.findings_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {timeAgo(s.scanned_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent findings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Findings
          </h2>
          <Link
            href="/findings"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rule
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Repository
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  File
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
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : findings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No findings yet
                  </td>
                </tr>
              ) : (
                findings.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        {f.rule_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-45 truncate">
                      {repoName(f.repo_url)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 max-w-50 truncate">
                      {f.file_path}
                      {f.line_number ? `:${f.line_number}` : ""}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                      {shortSha(f.commit_sha)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {timeAgo(f.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
