import { useMemo } from "react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { getProgress } from "@/lib/progress";
import { getAchievements } from "@/lib/achievements";
import { ProgressView } from "@/components/progress-view";
import { AchievementStrip } from "@/components/achievements";

export default function ProgressPage() {
  const { me: profile, programs, workouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);

  const summary = useMemo(() => getProgress(profile.id, workouts, exercises), [profile.id, workouts, exercises]);
  const achievements = useMemo(
    () => getAchievements(profile.id, workouts, programs, exercises),
    [profile.id, workouts, programs, exercises],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-[2rem] leading-tight font-bold">{t("progress.title")}</h1>
      <AchievementStrip
        achievements={achievements}
        t={t}
        unit={profile.unit}
        locale={locale}
        href="/achievements"
      />
      <ProgressView summary={summary} unit={profile.unit} locale={locale} />
    </div>
  );
}
