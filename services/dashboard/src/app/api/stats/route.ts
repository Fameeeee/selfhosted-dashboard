import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [scansRes, findingsRes, reposRes, recentRes] = await Promise.all([
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM scans"),
      pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM findings"),
      pool.query<{ count: string }>(
        "SELECT COUNT(DISTINCT repo_url) AS count FROM scans"
      ),
      pool.query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM scans WHERE scanned_at >= NOW() - INTERVAL '24 hours'"
      ),
    ]);

    return NextResponse.json({
      totalScans: parseInt(scansRes.rows[0].count),
      totalFindings: parseInt(findingsRes.rows[0].count),
      reposScanned: parseInt(reposRes.rows[0].count),
      scansLast24h: parseInt(recentRes.rows[0].count),
    });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
