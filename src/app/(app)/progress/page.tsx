import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { getProgress } from "@/lib/progress";
import { getAchievements } from "@/lib/achievements";
import { ProgressView } from "@/components/progress-view";
import { AchievementStrip } from "@/components/achievements";

export default async function ProgressPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);

  const [summary, achievements] = await Promise.all([
    getProgress(profile.id),
    getAchievements(profile.id),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("progress.title")}</h1>
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
