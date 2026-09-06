"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { isLocale } from "@/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/i18n/server";

export async function inviteClient(formData: FormData) {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") redirect("/login");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) redirect("/?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("invites")
    .insert({ email, invited_by: profile.id });

  if (error) {
    redirect(error.code === "23505" ? "/?error=exists" : "/?error=failed");
  }
  revalidatePath("/");
  redirect("/?invited=1");
}

export async function removeInvite(formData: FormData) {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") redirect("/login");

  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  await supabase.from("invites").delete().eq("email", email);
  revalidatePath("/");
}

export async function renameClient(formData: FormData) {
  const profile = await getProfile();
  if (!profile || profile.role !== "coach") redirect("/login");

  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  if (!id) redirect("/");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", id)
    .eq("role", "client");

  revalidatePath("/");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}${error ? "?error=rename" : "?renamed=1"}`);
}

export async function updateProfile(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const unit = formData.get("unit") === "lb" ? "lb" : "kg";
  const localeRaw = formData.get("locale");
  const locale = isLocale(localeRaw) ? localeRaw : "en";

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null, unit, locale })
    .eq("id", profile.id);

  if (!error) {
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/", "layout");
  redirect(error ? "/settings?error=1" : "/settings?saved=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
