"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type Profile } from "@/lib/profile";
import { str } from "@/lib/form";
import { coachIdsExcept, sendPushTo } from "@/lib/push";
import type { TranslationKey } from "@/i18n/dictionaries";

export type SetInput = {
  program_exercise_id: string;
  set_no: number;
  reps: number | null;
  weight: number | null; // kg
  time_sec: number | null;
};

export type NoteInput = { program_exercise_id: string; note: string };

export type FinishInput = {
  dayId: string;
  comment: string;
  sets: SetInput[];
  notes?: NoteInput[];
  /** Coach logging on behalf of a client. */
  clientId?: string;
};

function cleanInt(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), max);
}
function cleanNum(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v * 100) / 100, max);
}

function cleanSets(sets: SetInput[] | undefined) {
  return (sets ?? [])
    .map((s) => ({
      program_exercise_id: String(s.program_exercise_id),
      set_no: cleanInt(s.set_no, 100) ?? 1,
      reps: cleanInt(s.reps, 1000),
      weight: cleanNum(s.weight, 2000),
      time_sec: cleanInt(s.time_sec, 86400),
    }))
    .filter((s) => s.reps != null || s.weight != null || s.time_sec != null);
}

function cleanNotes(notes: NoteInput[] | undefined) {
  return (notes ?? [])
    .map((n) => ({ program_exercise_id: String(n.program_exercise_id), note: String(n.note ?? "").trim().slice(0, 500) }))
    .filter((n) => n.note.length > 0);
}

/** Who the workout belongs to: the actor, or a client when the coach logs for them. */
function resolveOwner(profile: Profile, clientId: string | undefined): string {
  return clientId && profile.role === "coach" && clientId !== profile.id ? clientId : profile.id;
}

function revalidateClientPages(clientId?: string) {
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/program");
  revalidatePath("/history");
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function finishWorkout(input: FinishInput): Promise<{ error: TranslationKey } | void> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const ownerId = resolveOwner(profile, input.clientId);
  const forClient = ownerId !== profile.id;

  const sets = cleanSets(input.sets);
  if (sets.length === 0) return { error: "workout.noSets" };

  const supabase = await createClient();
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      program_day_id: input.dayId,
      client_id: ownerId,
      status: "done",
      client_comment: input.comment?.trim() ? input.comment.trim().slice(0, 2000) : null,
    })
    .select("id")
    .single();
  if (error || !workout) return { error: "common.error" };

  const { error: setsError } = await supabase
    .from("set_logs")
    .insert(sets.map((s) => ({ ...s, workout_id: workout.id })));
  if (setsError) {
    await supabase.from("workouts").delete().eq("id", workout.id);
    return { error: "common.error" };
  }

  const notes = cleanNotes(input.notes);
  if (notes.length > 0) {
    await supabase
      .from("workout_exercise_notes")
      .insert(notes.map((n) => ({ ...n, workout_id: workout.id })));
  }

  // Tell the coach, unless the coach logged it (own or for a client).
  if (profile.role !== "coach") {
    const { data: day } = await supabase
      .from("program_days")
      .select("week_no, day_no, title")
      .eq("id", input.dayId)
      .maybeSingle();
    const comment = input.comment?.trim() ?? "";
    await sendPushTo(await coachIdsExcept(profile.id), (t) => ({
      title: t("push.workoutDone.title", { name: profile.full_name ?? profile.email }),
      body:
        (day ? `${t("prog.week", { n: day.week_no })} · ${t("prog.day", { n: day.day_no })}${day.title ? ` · ${day.title}` : ""}` : "") +
        (comment ? `\n“${comment.slice(0, 120)}”` : ""),
      url: `/history/${workout.id}`,
    }));
  }

  revalidateClientPages(forClient ? ownerId : undefined);
  redirect(forClient ? `/clients/${ownerId}?done=1` : "/?done=1");
}

export type UpdateInput = {
  workoutId: string;
  comment: string;
  performedAt: string;
  sets: SetInput[];
  notes?: NoteInput[];
};

/** Replace a logged workout's sets, comment, and date. RLS limits this to the owner or the coach. */
export async function updateWorkout(input: UpdateInput): Promise<{ error: TranslationKey } | void> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const sets = cleanSets(input.sets);
  if (sets.length === 0) return { error: "workout.noSets" };

  const performedAt = new Date(input.performedAt);
  if (Number.isNaN(performedAt.getTime())) return { error: "common.error" };

  const supabase = await createClient();
  const { data: workout, error } = await supabase
    .from("workouts")
    .update({
      client_comment: input.comment?.trim() ? input.comment.trim().slice(0, 2000) : null,
      performed_at: performedAt.toISOString(),
      status: "done",
    })
    .eq("id", input.workoutId)
    .select("id, client_id")
    .maybeSingle();
  if (error || !workout) return { error: "common.error" };

  const { error: delError } = await supabase.from("set_logs").delete().eq("workout_id", workout.id);
  if (delError) return { error: "common.error" };
  const { error: insError } = await supabase
    .from("set_logs")
    .insert(sets.map((s) => ({ ...s, workout_id: workout.id })));
  if (insError) return { error: "common.error" };

  await supabase.from("workout_exercise_notes").delete().eq("workout_id", workout.id);
  const notes = cleanNotes(input.notes);
  if (notes.length > 0) {
    await supabase
      .from("workout_exercise_notes")
      .insert(notes.map((n) => ({ ...n, workout_id: workout.id })));
  }

  revalidateClientPages(workout.client_id !== profile.id ? workout.client_id : undefined);
  revalidatePath(`/history/${workout.id}`);
  redirect(`/history/${workout.id}?saved=1`);
}

export async function skipDay(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const ownerId = resolveOwner(profile, str(formData, "client_id") || undefined);
  const forClient = ownerId !== profile.id;

  const dayId = str(formData, "day_id");
  const supabase = await createClient();
  await supabase
    .from("workouts")
    .insert({ program_day_id: dayId, client_id: ownerId, status: "skipped" });

  revalidateClientPages(forClient ? ownerId : undefined);
  redirect(forClient ? `/clients/${ownerId}?skipped=1` : "/?skipped=1");
}

export async function deleteWorkout(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const id = str(formData, "id");
  const supabase = await createClient();
  const { data: w } = await supabase.from("workouts").select("client_id").eq("id", id).maybeSingle();
  await supabase.from("workouts").delete().eq("id", id);

  const forClient = w && w.client_id !== profile.id;
  revalidateClientPages(forClient ? w.client_id : undefined);
  redirect(forClient ? `/clients/${w.client_id}` : "/history");
}
