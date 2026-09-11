"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type Profile } from "@/lib/profile";
import { str, nullable } from "@/lib/form";
import { youtubeId } from "@/lib/youtube";
import { MUSCLE_GROUPS, type MuscleGroup, type TranslationKey } from "@/i18n/dictionaries";

export type ExerciseFormState = { error: TranslationKey } | null;

/** Anyone signed in may add to the shared library; only the author (or a coach) may change an entry. */
async function mayEdit(profile: Profile, id: string): Promise<boolean> {
  if (profile.role === "coach") return true;
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("created_by").eq("id", id).maybeSingle();
  return data?.created_by === profile.id;
}

export async function saveExercise(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const id = str(formData, "id");
  if (id && !(await mayEdit(profile, id))) return { error: "ex.notYours" };
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
    : await supabase.from("exercises").insert({ ...payload, created_by: profile.id });

  if (error) return { error: "common.error" };

  revalidatePath("/exercises");
  redirect("/exercises");
}

export async function deleteExercise(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const id = str(formData, "id");
  if (!id) redirect("/exercises");
  if (!(await mayEdit(profile, id))) redirect(`/exercises/${id}?error=notYours`);

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) {
    redirect(`/exercises/${id}?error=${error.code === "23503" ? "inUse" : "failed"}`);
  }
  revalidatePath("/exercises");
  redirect("/exercises");
}
