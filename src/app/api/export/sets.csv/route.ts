import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * CSV of every logged set, gated by the caller's export token.
 * Used by the "Download CSV" button and by Google Sheets =IMPORTDATA(...).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (token.length < 32) {
    return new NextResponse("Missing or invalid token", { status: 401 });
  }

  // Anonymous client: the token, not a session, decides what the function returns.
  const supabase = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.rpc("export_sets", { p_token: token });
  if (error) {
    return new NextResponse("Export failed", { status: 500 });
  }

  const header = [
    "date",
    "client",
    "email",
    "program",
    "week",
    "day",
    "day_title",
    "exercise",
    "set",
    "weight_kg",
    "reps",
    "seconds",
    "rpe",
    "exercise_note",
    "comment",
    "workout_id",
  ];
  const lines = [header.join(",")];
  for (const r of data ?? []) {
    lines.push(
      [
        r.performed_at,
        r.client_name ?? "",
        r.client_email,
        r.program,
        r.week_no,
        r.day_no,
        r.day_title ?? "",
        r.exercise,
        r.set_no,
        r.weight_kg ?? "",
        r.reps ?? "",
        r.time_sec ?? "",
        r.rpe ?? "",
        r.exercise_note ?? "",
        r.workout_comment ?? "",
        r.workout_id,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM so Excel and Sheets read Cyrillic correctly.
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  const download = searchParams.get("download") === "1";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="mystrong-sets.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
