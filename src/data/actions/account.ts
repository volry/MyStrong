import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { go } from "@/lib/nav";
import { nullable, str } from "@/lib/form";
import { youtubeId } from "@/lib/youtube";
import { isLocale, MUSCLE_GROUPS, type MuscleGroup, type TranslationKey } from "@/i18n/dictionaries";
import { REST_TIMER_CHOICES } from "@/lib/rest-timer";
import { rememberLocale } from "@/i18n/client";
import type { Profile } from "@/lib/profile";
import type { Exercise, ExerciseDoc, InviteDoc, Program } from "../types";
import { fire, newId, now } from "../write";
import { track } from "@/lib/analytics";

// ---------- settings ----------

export function updateProfile(profile: Profile, formData: FormData) {
  const localeRaw = formData.get("locale");
  const locale = isLocale(localeRaw) ? localeRaw : "en";
  const rest = Number(formData.get("rest_timer_sec"));
  fire(
    updateDoc(doc(db, "users", profile.id), {
      full_name: str(formData, "full_name").slice(0, 80) || null,
      unit: formData.get("unit") === "lb" ? "lb" : "kg",
      locale,
      rest_timer_sec: (REST_TIMER_CHOICES as readonly number[]).includes(rest) ? rest : 0,
    }),
  );
  rememberLocale(locale);
  go("/settings?saved=1", { replace: true });
}

export async function signOut() {
  await firebaseSignOut(auth);
  go("/login", { replace: true });
}

// ---------- clients & invites (coach) ----------

export function inviteClient(profile: Profile, formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  if (!email.includes("@")) return go("/?error=invalid", { replace: true });
  const invite: InviteDoc = {
    email,
    role: formData.get("role") === "coach" ? "coach" : "client",
    full_name: nullable(str(formData, "full_name").slice(0, 80)),
    invited_by: profile.id,
    created_at: now(),
    accepted_at: null,
  };
  fire(setDoc(doc(db, "invites", email), invite));
  track("invite_send", { role: invite.role });
  go("/?invited=1", { replace: true });
}

export function removeInvite(email: string) {
  fire(deleteDoc(doc(db, "invites", email)));
}

export function renameClient(clientId: string, formData: FormData) {
  fire(updateDoc(doc(db, "users", clientId), { full_name: str(formData, "full_name").slice(0, 80) || null }));
  go(`/clients/${clientId}?renamed=1`, { replace: true });
}

// ---------- exercise library ----------

export type ExerciseFormState = { error: TranslationKey } | null;

/** Anyone may add to the shared library; only the author (or a coach) may change an entry. */
export function mayEditExercise(profile: Profile, exercise: Pick<Exercise, "created_by">): boolean {
  return profile.role === "coach" || exercise.created_by === profile.id;
}

export function saveExercise(profile: Profile, existing: Exercise | null, formData: FormData): ExerciseFormState {
  if (existing && !mayEditExercise(profile, existing)) return { error: "ex.notYours" };
  const name = str(formData, "name");
  if (!name) return { error: "common.error" };

  const youtubeUrl = str(formData, "youtube_url");
  if (youtubeUrl && !youtubeId(youtubeUrl)) return { error: "ex.badVideo" };

  const muscleRaw = str(formData, "muscle_group");
  const muscle_group = (MUSCLE_GROUPS as readonly string[]).includes(muscleRaw) ? (muscleRaw as MuscleGroup) : null;

  const payload = {
    name: name.slice(0, 120),
    youtube_url: nullable(youtubeUrl),
    muscle_group,
    description: nullable(str(formData, "description").slice(0, 4000)),
  };
  if (existing) {
    fire(updateDoc(doc(db, "exercises", existing.id), payload));
  } else {
    const created: ExerciseDoc = { ...payload, created_by: profile.id, created_at: now() };
    fire(setDoc(doc(db, "exercises", newId("exercises")), created));
  }
  go("/exercises", { replace: true });
  return null;
}

/** Programs still pointing at an exercise keep it: deleting would blank their days. */
export function deleteExercise(profile: Profile, exercise: Exercise, programs: Program[]) {
  if (!mayEditExercise(profile, exercise)) return go(`/exercises/${exercise.id}?error=notYours`, { replace: true });
  // A client only sees their own programs; the rules still refuse what they may not delete.
  const inUse = programs.some((p) => p.days.some((d) => d.items.some((i) => i.exercise_id === exercise.id)));
  if (inUse) return go(`/exercises/${exercise.id}?error=inUse`, { replace: true });
  fire(deleteDoc(doc(db, "exercises", exercise.id)));
  go("/exercises", { replace: true });
}

// ---------- CSV export link ----------

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(30));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // 40 chars
}

/** Replace the token: old links stop working immediately. */
export function regenerateExportToken(profile: Profile, current: string | null) {
  if (current) fire(deleteDoc(doc(db, "exportTokens", current)));
  fire(setDoc(doc(db, "exportTokens", newToken()), { user_id: profile.id, created_at: now() }));
}

// ---------- push subscriptions ----------

export type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

async function endpointId(endpoint: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function savePushSubscription(profile: Profile, sub: SubscriptionInput): Promise<{ ok: boolean }> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  fire(
    setDoc(doc(db, "users", profile.id, "push", await endpointId(sub.endpoint)), {
      endpoint: sub.endpoint.slice(0, 2000),
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      created_at: now(),
    }),
  );
  return { ok: true };
}

export async function removePushSubscription(profile: Profile, endpoint: string): Promise<{ ok: boolean }> {
  fire(deleteDoc(doc(db, "users", profile.id, "push", await endpointId(endpoint))));
  return { ok: true };
}
