import { NextResponse } from "next/server";
import pool from "@/lib/db";

export interface Scan {
  id: number;
  delivery_id: string;
  repo_url: string;
  event: string;
  scanned_at: string;
  findings_count: number;
}

export async function GET() {
  try {
    const result = await pool.query<Scan>(`
      SELECT
        s.id,
        s.delivery_id,
        s.repo_url,
        s.event,
        s.scanned_at,
        COUNT(f.id)::int AS findings_count
      FROM scans s
      LEFT JOIN findings f ON f.scan_id = s.id
      GROUP BY s.id
      ORDER BY s.scanned_at DESC
      LIMIT 100
    `);
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
