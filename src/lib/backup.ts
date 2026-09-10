import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Weekly backup: dump every app table to JSON and upload it to a folder in the
 * coach's Google Drive. Google access uses an OAuth refresh token stored in the
 * database (private schema), obtained once via /api/backup/google/start.
 */

const FOLDER_NAME = "myStrong backups";
const KEEP = 12;
const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function secret(): string {
  const s = process.env.BACKUP_SECRET;
  if (!s) throw new Error("BACKUP_SECRET is not set");
  return s;
}

/** Anonymous client: the shared secret, not a session, gates the backup functions. */
function db() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export type BackupConfig = {
  connected: boolean;
  account: string | null;
  folderId: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastFile: string | null;
};

export async function getBackupConfig(): Promise<BackupConfig> {
  const { data } = await db().rpc("backup_get_config", { p_secret: secret() });
  const row = data?.[0];
  return {
    connected: Boolean(row?.google_refresh_token),
    account: row?.google_account ?? null,
    folderId: row?.google_folder_id ?? null,
    lastRunAt: row?.last_run_at ?? null,
    lastStatus: row?.last_status ?? null,
    lastFile: row?.last_file ?? null,
  };
}

// ---------- Google OAuth ----------

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function googleEmail(token: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return ((await res.json()) as { email?: string }).email ?? null;
}

async function ensureFolder(token: string, existing: string | null): Promise<string> {
  if (existing) {
    const check = await fetch(`${DRIVE}/files/${existing}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (check.ok) {
      const f = (await check.json()) as { trashed?: boolean };
      if (!f.trashed) return existing;
    }
  }
  const res = await fetch(`${DRIVE}/files?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) throw new Error(`folder create failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/** Called once from the OAuth callback: store the refresh token and make sure the folder exists. */
export async function connectGoogle(code: string, redirectUri: string): Promise<{ account: string | null }> {
  const tokens = await exchangeCode(code, redirectUri);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token; remove the app's access in the Google account and connect again");
  }
  const current = await getBackupConfig();
  const folderId = await ensureFolder(tokens.access_token, current.folderId);
  const account = await googleEmail(tokens.access_token);
  await db().rpc("backup_set_google", {
    p_secret: secret(),
    p_refresh_token: tokens.refresh_token,
    p_folder_id: folderId,
    p_account: account ?? "",
  });
  return { account };
}

export async function disconnectGoogle(): Promise<void> {
  await db().rpc("backup_set_google", { p_secret: secret(), p_refresh_token: "", p_folder_id: "", p_account: "" });
}

// ---------- the backup itself ----------

async function uploadJson(token: string, folderId: string, name: string, body: string): Promise<string> {
  const boundary = "mystrong" + Date.now().toString(36);
  const multipart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name, parents: [folderId], mimeType: "application/json" }) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    body +
    `\r\n--${boundary}--`;
  const res = await fetch(UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { name: string }).name;
}

async function pruneOld(token: string, folderId: string): Promise<void> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false and name contains 'mystrong-backup-'`);
  const res = await fetch(`${DRIVE}/files?q=${q}&orderBy=createdTime desc&pageSize=100&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return;
  const { files } = (await res.json()) as { files: { id: string; name: string }[] };
  for (const f of files.slice(KEEP)) {
    await fetch(`${DRIVE}/files/${f.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  }
}

export async function runBackup(): Promise<{ ok: true; file: string } | { ok: false; error: string }> {
  const client = db();
  const s = secret();
  try {
    const cfg = await getBackupConfig();
    if (!cfg.connected) throw new Error("Google Drive is not connected");
    if (!googleConfigured()) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set");

    const { data: rows } = await client.rpc("backup_get_config", { p_secret: s });
    const refreshToken = rows?.[0]?.google_refresh_token;
    if (!refreshToken) throw new Error("no refresh token");

    const { data: dump, error } = await client.rpc("backup_dump", { p_secret: s });
    if (error || !dump) throw new Error(error?.message ?? "dump failed");

    const token = await accessToken(refreshToken);
    const folderId = await ensureFolder(token, cfg.folderId);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const name = `mystrong-backup-${stamp}.json`;
    const file = await uploadJson(token, folderId, name, JSON.stringify(dump));
    await pruneOld(token, folderId);

    await client.rpc("backup_mark_run", { p_secret: s, p_status: "ok", p_file: file });
    return { ok: true, file };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await client.rpc("backup_mark_run", { p_secret: s, p_status: `error: ${message}`, p_file: "" });
    return { ok: false, error: message };
  }
}
