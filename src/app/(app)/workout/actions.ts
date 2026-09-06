"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
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

export type FinishInput = {
  dayId: string;
  comment: string;
  sets: SetInput[];
};

function cleanInt(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), max);
}
function cleanNum(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v * 100) / 100, max);
}

function revalidateClientPages() {
  revalidatePath("/");
  revalidatePath("/program");
  revalidatePath("/history");
}

export async function finishWorkout(input: FinishInput): Promise<{ error: TranslationKey } | void> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const sets = (input.sets ?? [])
    .map((s) => ({
      program_exercise_id: String(s.program_exercise_id),
      set_no: cleanInt(s.set_no, 100) ?? 1,
      reps: cleanInt(s.reps, 1000),
      weight: cleanNum(s.weight, 2000),
      time_sec: cleanInt(s.time_sec, 86400),
    }))
    .filter((s) => s.reps != null || s.weight != null || s.time_sec != null);
  if (sets.length === 0) return { error: "workout.noSets" };

  const supabase = await createClient();
  const { data: workout, error } = await supabase
    .from("workouts")
    .insert({
      program_day_id: input.dayId,
      client_id: profile.id,
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

  // Tell the coach (unless the coach logged their own workout).
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

  revalidateClientPages();
  redirect("/?done=1");
}

export type UpdateInput = {
  workoutId: string;
  comment: string;
  performedAt: string;
  sets: SetInput[];
};

/** Replace a logged workout's sets, comment, and date. RLS limits this to the owner. */
export async function updateWorkout(input: UpdateInput): Promise<{ error: TranslationKey } | void> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const sets = (input.sets ?? [])
    .map((s) => ({
      program_exercise_id: String(s.program_exercise_id),
      set_no: cleanInt(s.set_no, 100) ?? 1,
      reps: cleanInt(s.reps, 1000),
      weight: cleanNum(s.weight, 2000),
      time_sec: cleanInt(s.time_sec, 86400),
    }))
    .filter((s) => s.reps != null || s.weight != null || s.time_sec != null);
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
    .eq("client_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error || !workout) return { error: "common.error" };

  const { error: delError } = await supabase.from("set_logs").delete().eq("workout_id", workout.id);
  if (delError) return { error: "common.error" };
  const { error: insError } = await supabase
    .from("set_logs")
    .insert(sets.map((s) => ({ ...s, workout_id: workout.id })));
  if (insError) return { error: "common.error" };

  revalidateClientPages();
  revalidatePath(`/history/${workout.id}`);
  redirect(`/history/${workout.id}?saved=1`);
}

export async function skipDay(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const dayId = str(formData, "day_id");
  const supabase = await createClient();
  await supabase
    .from("workouts")
    .insert({ program_day_id: dayId, client_id: profile.id, status: "skipped" });

  revalidateClientPages();
  redirect("/?skipped=1");
}

export async function deleteWorkout(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const id = str(formData, "id");
  const supabase = await createClient();
  await supabase.from("workouts").delete().eq("id", id);

  revalidateClientPages();
  redirect("/history");
}
