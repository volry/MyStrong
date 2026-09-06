"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCoach } from "@/lib/coach";
import { str, nullable } from "@/lib/form";
import { youtubeId } from "@/lib/youtube";
import { MUSCLE_GROUPS, type MuscleGroup, type TranslationKey } from "@/i18n/dictionaries";

export type ExerciseFormState = { error: TranslationKey } | null;

export async function saveExercise(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const coach = await requireCoach();

  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return { error: "common.error" };

  const youtubeUrl = str(formData, "youtube_url");
  if (youtubeUrl && !youtubeId(youtubeUrl)) return { error: "ex.badVideo" };

  const muscleRaw = str(formData, "muscle_group");
  const muscle_group = (MUSCLE_GROUPS as readonly string[]).includes(muscleRaw)
    ? (muscleRaw as MuscleGroup)
    : null;

  const payload = {
    name,
    youtube_url: nullable(youtubeUrl),
    muscle_group,
    description: nullable(str(formData, "description")),
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("exercises").update(payload).eq("id", id)
    : await supabase.from("exercises").insert({ ...payload, created_by: coach.id });

  if (error) return { error: "common.error" };

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function deleteExercise(formData: FormData) {
  await requireCoach();
  const id = str(formData, "id");
  if (!id) redirect("/exercises");

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) {
    redirect(`/exercises/${id}?error=${error.code === "23503" ? "inUse" : "failed"}`);
  }
  revalidatePath("/exercises");
  redirect("/exercises");
}
