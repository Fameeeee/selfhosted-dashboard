"use client";

import { useEffect, useState } from "react";

interface Scan {
  id: number;
  delivery_id: string;
  repo_url: string;
  event: string;
  scanned_at: string;
  findings_count: number;
}

function repoName(url: string) {
  return url.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
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

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/scans")
      .then((r) => r.json())
      .then((data) => {
        setScans(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const filtered = scans.filter((s) =>
    repoName(s.repo_url).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scans</h1>
          <p className="mt-1 text-sm text-slate-500">
            All repository scans ordered by most recent
          </p>
        </div>
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
            placeholder="Filter by repository…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-6 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm text-sm">
        <span className="text-slate-500">
          Total: <span className="font-semibold text-slate-900">{scans.length}</span>
        </span>
        <span className="text-slate-500">
          With findings:{" "}
          <span className="font-semibold text-red-600">
            {scans.filter((s) => s.findings_count > 0).length}
          </span>
        </span>
        <span className="text-slate-500">
          Clean:{" "}
          <span className="font-semibold text-emerald-600">
            {scans.filter((s) => s.findings_count === 0).length}
          </span>
        </span>
      </div>

      {/* Table */}
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
                Delivery ID
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scanned At
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                  {search ? "No scans match your filter" : "No scans yet"}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">
                    {repoName(s.repo_url)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {s.event}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                        s.findings_count > 0
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {s.findings_count > 0 ? `${s.findings_count} found` : "Clean"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-400 max-w-40 truncate">
                    {s.delivery_id}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(s.scanned_at)}
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
