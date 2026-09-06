"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export type SubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function savePushSubscription(sub: SubscriptionInput): Promise<{ ok: boolean }> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint.slice(0, 2000),
      user_id: profile.id,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", profile.id);
  return { ok: !error };
}
