import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronLeft, PartyPopper } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { getAchievements, sortForDisplay } from "@/lib/achievements";
import { Button } from "@/components/ui/button";
import { AchievementList, AchievementRow } from "@/components/achievements";

export default function AchievementsPage() {
  const { me: profile, programs, workouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const [search] = useSearchParams();
  const workoutId = search.get("new");

  const achievements = useMemo(
    () => getAchievements(profile.id, workouts, programs, exercises),
    [profile.id, workouts, programs, exercises],
  );
  // What that one workout earned — the reason this screen opened.
  const fresh = workoutId ? sortForDisplay(achievements.filter((a) => a.unlockedBy === workoutId)) : [];

  return (
    <div className="space-y-5">
      <div>
        <Link to="/progress" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
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
          <Button render={<Link to={profile.role === "coach" ? "/me" : "/"} />} className="h-11 w-full text-base">
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
