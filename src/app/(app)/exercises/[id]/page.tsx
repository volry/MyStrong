import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { MuscleBadge } from "@/components/muscle-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { ExerciseForm } from "../exercise-form";
import { deleteExercise } from "../actions";

export default async function EditExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, youtube_url, description, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  // A client may change only the exercises they added themselves.
  const mayEdit = profile.role === "coach" || exercise.created_by === profile.id;
  if (!mayEdit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
        <MuscleBadge group={exercise.muscle_group} t={t} />
        <YoutubeEmbed url={exercise.youtube_url} title={exercise.name} />
        {exercise.description && <p className="whitespace-pre-wrap text-sm">{exercise.description}</p>}
        <p className="text-sm text-muted-foreground">{t("ex.notYours")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("ex.edit")}</h1>
      <ExerciseForm locale={locale} exercise={exercise} />

      <form action={deleteExercise} className="border-t pt-4">
        <input type="hidden" name="id" value={exercise.id} />
        {error === "inUse" && <p className="mb-2 text-sm text-destructive">{t("ex.inUse")}</p>}
        {error === "notYours" && <p className="mb-2 text-sm text-destructive">{t("ex.notYours")}</p>}
        {error === "failed" && <p className="mb-2 text-sm text-destructive">{t("common.error")}</p>}
        <ConfirmButton
          type="submit"
          variant="ghost"
          className="w-full text-destructive"
          message={t("common.confirmDelete")}
        >
          {t("ex.delete")}
        </ConfirmButton>
      </form>
    </div>
  );
}
