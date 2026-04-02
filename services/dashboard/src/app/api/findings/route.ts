import { NextResponse } from "next/server";
import pool from "@/lib/db";

export interface Finding {
  id: number;
  scan_id: number;
  rule_id: string;
  description: string;
  file_path: string;
  line_number: number;
  commit_sha: string;
  created_at: string;
  repo_url: string;
  scanned_at: string;
}

export async function GET() {
  try {
    const result = await pool.query<Finding>(`
      SELECT
        f.id,
        f.scan_id,
        f.rule_id,
        f.description,
        f.file_path,
        f.line_number,
        f.commit_sha,
        f.created_at,
        s.repo_url,
        s.scanned_at
      FROM findings f
      JOIN scans s ON s.id = f.scan_id
      ORDER BY f.created_at DESC
      LIMIT 200
    `);
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
