import { type NextRequest, NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export const maxDuration = 120;

/** Weekly Vercel Cron target (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await runBackup();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
