import { Navigate, useParams, useSearchParams } from "react-router";
import { useData } from "@/data/store";
import { deleteExercise, mayEditExercise } from "@/data/actions/account";
import { makeT } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/client";
import { MuscleBadge } from "@/components/muscle-badges";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { ExerciseForm } from "@/components/exercise-form";

export default function EditExercisePage() {
  const data = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  const exercise = id ? data.exercises.get(id) : undefined;
  if (!exercise) return <Navigate to="/exercises" replace />;

  // A client may change only the exercises they added themselves.
  if (!mayEditExercise(data.me, exercise)) {
    return (
      <div className="space-y-4">
        <h1 className="text-[2rem] leading-tight font-bold">{exercise.name}</h1>
        <MuscleBadge group={exercise.muscle_group} t={t} />
        <YoutubeEmbed url={exercise.youtube_url} title={exercise.name} />
        {exercise.description && <p className="whitespace-pre-wrap text-sm">{exercise.description}</p>}
        <p className="text-sm text-muted-foreground">{t("ex.notYours")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[2rem] leading-tight font-bold">{t("ex.edit")}</h1>
      <ExerciseForm key={exercise.id} locale={locale} exercise={exercise} />

      <form action={() => deleteExercise(data.me, exercise, data.programs)} className="border-t pt-4">
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
