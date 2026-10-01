import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { getProgress } from "@/lib/progress";
import { getAchievements } from "@/lib/achievements";
import { ProgressView } from "@/components/progress-view";
import { AchievementStrip } from "@/components/achievements";

export default function ClientProgressPage() {
  const { me: coach, users, programs, workouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id = "" } = useParams();

  const summary = useMemo(() => getProgress(id, workouts, exercises), [id, workouts, exercises]);
  const achievements = useMemo(
    () => getAchievements(id, workouts, programs, exercises),
    [id, workouts, programs, exercises],
  );

  const client = users.get(id);
  if (coach.role !== "coach" || !client || (client.role !== "client" && client.id !== coach.id)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/clients/${client.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {client.full_name ?? client.email}
        </Link>
        <h1 className="text-[2rem] leading-tight font-bold">{t("progress.title")}</h1>
      </div>
      <AchievementStrip achievements={achievements} t={t} unit={coach.unit} locale={locale} />
      <ProgressView summary={summary} unit={coach.unit} locale={locale} />
    </div>
  );
}
