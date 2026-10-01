import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { muscleSummary } from "@/lib/muscles";
import { dayItems, findDay, previousSets } from "@/lib/client-data";
import { getExerciseStats } from "@/lib/exercise-stats";
import { MuscleBadges } from "@/components/muscle-badges";
import { WorkoutForm } from "@/components/workout-form";

export default function WorkoutPage() {
  const { me: profile, users, programs, workouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { dayId = "" } = useParams();
  const [search] = useSearchParams();
  const forParam = search.get("for");

  // Coach logging on behalf of a client: the workout belongs to the client.
  const forClient = Boolean(forParam && profile.role === "coach" && forParam !== profile.id);
  const client = forClient ? users.get(forParam!) : undefined;
  const owner = client
    ? { id: client.id, name: client.full_name ?? client.email, unit: client.unit, focus: client.focus }
    : { id: profile.id, name: null as string | null, unit: profile.unit, focus: profile.focus };

  const found = findDay(programs, dayId);
  const items = useMemo(() => {
    const day = findDay(programs, dayId)?.day;
    return day ? dayItems(day, exercises) : [];
  }, [programs, dayId, exercises]);
  const previous = useMemo(() => previousSets(owner.id, workouts), [owner.id, workouts]);
  // History, records and the chosen focus metric for the day's exercises, so the
  // sheet and the picker open instantly.
  const stats = useMemo(
    () =>
      getExerciseStats(
        owner.id,
        workouts,
        items.map((i) => i.exercise?.id).filter((id): id is string => Boolean(id)),
      ),
    [owner.id, workouts, items],
  );

  if (!found || (forClient && !client)) return <Navigate to="/" replace />;
  const { program, day } = found;

  // Newest first.
  const lastDone = workouts.find(
    (w) => w.program_day_id === day.id && w.client_id === owner.id && w.status === "done",
  );

  const backHref = forClient ? `/clients/${owner.id}` : profile.role === "coach" ? "/me" : "/";

  return (
    <div className="space-y-4">
      <div>
        <Link to={backHref} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {forClient ? owner.name : program.name}
        </Link>
        <h1 className="text-[2rem] leading-tight font-bold">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
        {day.title && <p className="text-muted-foreground">{day.title}</p>}
        <div className="mt-2">
          <MuscleBadges groups={muscleSummary(items)} t={t} />
        </div>
        {forClient && (
          <p className="mt-1 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
            {t("coach.loggingFor", { name: owner.name ?? "" })}
          </p>
        )}
      </div>

      {lastDone && (
        <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
          {t("workout.alreadyDone", { date: formatDate(lastDone.performed_at, locale) })}
        </p>
      )}

      <WorkoutForm
        locale={locale}
        unit={owner.unit}
        dayId={day.id}
        items={items}
        previous={previous}
        canLog
        clientId={forClient ? owner.id : undefined}
        restTimerSec={profile.rest_timer_sec}
        stats={stats}
        focus={owner.focus}
      />
    </div>
  );
}
