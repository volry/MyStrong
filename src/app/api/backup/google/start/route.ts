import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/profile";
import { GOOGLE_SCOPE, googleConfigured } from "@/lib/backup";

function signState(userId: string, ts: number): string {
  const payload = `${userId}.${ts}`;
  const sig = createHmac("sha256", process.env.BACKUP_SECRET ?? "").update(payload).digest("base64url");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Coach-only: send the browser to Google's consent screen for the Drive "app files" scope. */
export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/settings?backup=unconfigured", request.url));
  }
  const redirectUri = new URL("/api/backup/google/callback", request.url).toString();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `${GOOGLE_SCOPE} https://www.googleapis.com/auth/userinfo.email`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(profile.id, Date.now()),
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
