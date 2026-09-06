import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { ConfirmButton } from "@/components/confirm-button";
import { ExerciseForm } from "../exercise-form";
import { deleteExercise } from "../actions";

export default async function EditExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: exercise } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, youtube_url, description")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("ex.edit")}</h1>
      <ExerciseForm locale={locale} exercise={exercise} />

      <form action={deleteExercise} className="border-t pt-4">
        <input type="hidden" name="id" value={exercise.id} />
        {error === "inUse" && <p className="mb-2 text-sm text-destructive">{t("ex.inUse")}</p>}
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
