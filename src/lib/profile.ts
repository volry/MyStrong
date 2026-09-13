import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "coach" | "client";
  unit: "kg" | "lb";
  locale: string;
  /** Rest countdown after a set, seconds. 0 = off. */
  rest_timer_sec: number;
};

/** Current user's profile, or null when signed out. Cached per request. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  let userId: string | undefined;
  try {
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims?.sub;
  } catch {
    return null;
  }
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, unit, locale, rest_timer_sec")
    .eq("id", userId)
    .single();

  return (profile as Profile | null) ?? null;
});
