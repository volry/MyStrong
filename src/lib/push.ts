import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { isLocale, makeT, type Locale, type T } from "@/i18n/dictionaries";

export type PushPayload = { title: string; body: string; url: string };

function configured() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

/**
 * Send a push to every device of the given users. Text is built per recipient locale.
 * Never throws: notifications are best-effort.
 */
export async function sendPushTo(
  userIds: string[],
  build: (t: T, locale: Locale) => PushPayload,
): Promise<void> {
  if (userIds.length === 0 || !configured()) return;
  try {
    const supabase = await createClient();
    const [{ data: subs }, { data: profiles }] = await Promise.all([
      supabase.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", userIds),
      supabase.from("profiles").select("id, locale").in("id", userIds),
    ]);
    if (!subs || subs.length === 0) return;
    const localeOf = new Map((profiles ?? []).map((p) => [p.id, isLocale(p.locale) ? p.locale : "en"] as const));

    await Promise.all(
      subs.map(async (s) => {
        const locale: Locale = localeOf.get(s.user_id) ?? "en";
        const payload = build(makeT(locale), locale);
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 12 },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          }
        }
      }),
    );
  } catch {
    // best-effort
  }
}

/** Ids of every coach except the actor. */
export async function coachIdsExcept(actorId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("role", "coach").neq("id", actorId);
  return (data ?? []).map((p) => p.id);
}
