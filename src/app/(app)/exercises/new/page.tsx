import { requireCoach } from "@/lib/coach";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { ExerciseForm } from "../exercise-form";

export default async function NewExercisePage() {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("ex.add")}</h1>
      <ExerciseForm locale={locale} />
    </div>
  );
}
