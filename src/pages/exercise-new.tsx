import { makeT } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/client";
import { ExerciseForm } from "@/components/exercise-form";

export default function NewExercisePage() {
  const locale = useLocale();
  const t = makeT(locale);

  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] leading-tight font-bold">{t("ex.add")}</h1>
      <ExerciseForm locale={locale} />
    </div>
  );
}
