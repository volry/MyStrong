import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/profile";
import { connectGoogle } from "@/lib/backup";

function validState(state: string | null, userId: string): boolean {
  if (!state) return false;
  try {
    const [uid, ts, sig] = Buffer.from(state, "base64url").toString().split(".");
    if (uid !== userId) return false;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return false;
    const expected = createHmac("sha256", process.env.BACKUP_SECRET ?? "").update(`${uid}.${ts}`).digest("base64url");
    return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Google redirects here after consent. Stores the refresh token and creates the backup folder. */
export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code || !validState(searchParams.get("state"), profile.id)) {
    return NextResponse.redirect(new URL("/settings?backup=denied", request.url));
  }
  try {
    const redirectUri = new URL("/api/backup/google/callback", request.url).toString();
    await connectGoogle(code, redirectUri);
    return NextResponse.redirect(new URL("/settings?backup=connected", request.url));
  } catch (err) {
    console.error("google connect failed", err);
    return NextResponse.redirect(new URL("/settings?backup=failed", request.url));
  }
}
