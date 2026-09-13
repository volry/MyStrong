import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, PartyPopper } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { getAchievements, sortForDisplay } from "@/lib/achievements";
import { Button } from "@/components/ui/button";
import { AchievementList, AchievementRow } from "@/components/achievements";

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { new: workoutId } = await searchParams;

  const achievements = await getAchievements(profile.id);
  // What that one workout earned — the reason this screen opened.
  const fresh = workoutId ? sortForDisplay(achievements.filter((a) => a.unlockedBy === workoutId)) : [];

  return (
    <div className="space-y-5">
      <div>
        <Link href="/progress" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("progress.title")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("ach.title")}</h1>
      </div>

      {fresh.length > 0 && (
        <div className="space-y-3 rounded-xl border border-primary bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <PartyPopper className="size-5 text-primary" />
            <div>
              <div className="font-semibold">{t("ach.doneTitle")}</div>
              <p className="text-sm text-muted-foreground">{t("ach.unlockedNow", { n: fresh.length })}</p>
            </div>
          </div>
          <div className="space-y-2">
            {fresh.map((a) => (
              <AchievementRow key={a.id} a={a} t={t} unit={profile.unit} locale={locale} highlight />
            ))}
          </div>
          <Button render={<Link href="/" />} className="h-11 w-full text-base">
            {t("ach.backHome")}
          </Button>
        </div>
      )}

      <AchievementList
        achievements={achievements}
        t={t}
        unit={profile.unit}
        locale={locale}
        highlight={fresh.map((a) => a.id)}
      />
    </div>
  );
}
