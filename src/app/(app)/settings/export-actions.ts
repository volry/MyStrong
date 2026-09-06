"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

function newToken() {
  return randomBytes(30).toString("base64url"); // 40 chars
}

/** Returns the user's export token, creating one on first use. */
export async function getOrCreateExportToken(): Promise<string | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("export_tokens")
    .select("token")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (existing) return existing.token;

  const token = newToken();
  const { error } = await supabase.from("export_tokens").insert({ user_id: profile.id, token });
  return error ? null : token;
}

/** Replace the token: old links stop working immediately. */
export async function regenerateExportToken() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  await supabase
    .from("export_tokens")
    .upsert({ user_id: profile.id, token: newToken() }, { onConflict: "user_id" });

  revalidatePath("/settings");
  redirect("/settings?export=new");
}
