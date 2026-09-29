import { useMemo } from "react";
import { Link } from "react-router";
import { CalendarCheck, ChevronRight, Flame, History, PencilRuler, Play, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/profile";
import { makeT, type Locale, type T } from "@/i18n/dictionaries";
import { useData } from "@/data/store";
import { getActiveProgram, getClientStats, type ClientStats, type ProgramDay } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** "Today" view: next workout of the active program. Used by clients at `/` and by the coach at `/me`. */
export function ClientHome({
  locale,
  profile,
  flags,
  manageHref,
}: {
  locale: Locale;
  profile: Profile;
  flags: { done?: string | null; skipped?: string | null };
  /** Coach only: link to manage their own programs. */
  manageHref?: string;
}) {
  const t = makeT(locale);
  const { programs, workouts, exercises } = useData();
  const data = useMemo(
    () => getActiveProgram(profile.id, programs, workouts, exercises),
    [profile.id, programs, workouts, exercises],
  );
  const stats = useMemo(() => getClientStats(profile.id, workouts), [profile.id, workouts]);
  // Workouts arrive newest first.
  const last = workouts.find((w) => w.client_id === profile.id && w.status === "done") ?? null;

  return (
    <div className="space-y-5">
      <h1 className="text-[2rem] leading-tight font-bold">
        {t("home.hello", { name: profile.full_name ?? "" })}
      </h1>

      {flags.done && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("today.saved")}</p>
      )}
      {flags.skipped && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("today.skipped")}</p>
      )}

      {stats.total > 0 && <StatTiles stats={stats} t={t} />}

      {!data ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-muted-foreground">{t("home.noProgram")}</p>
            {!manageHref && (
              <>
                <Button
                  render={<Link to="/my-programs" />}
                  variant="outline"
                  className="h-12 w-full text-base"
                >
                  <PencilRuler className="size-4" />
                  {t("mine.startOwn")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("mine.subtitle")}</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : data.nextDay ? (
        <NextWorkout
          t={t}
          programName={data.program.name}
          day={data.nextDay}
          progress={data.progress}
        />
      ) : (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p>{t("today.allDone")}</p>
            <Button render={<Link to="/program" />} variant="outline" className="h-12 w-full text-base">
              {t("nav.program")}
            </Button>
          </CardContent>
        </Card>
      )}

      {data?.program.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {data.program.created_by === profile.id ? t("mine.notes") : t("today.coachNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{data.program.notes}</CardContent>
        </Card>
      )}

      {last && (
        <Link to={`/history/${last.id}`} className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{t("today.lastWorkout")}</div>
            <div className="font-medium">
              {formatDate(last.performed_at, locale)}
              {last.day
                ? ` · ${t("prog.week", { n: last.day.week_no })} · ${t("prog.day", { n: last.day.day_no })}`
                : ""}
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {manageHref && (
        <Button render={<Link to={manageHref} />} variant="outline" className="h-12 w-full text-base">
          <Settings2 className="size-4" />
          {t("me.manage")}
        </Button>
      )}

      {!manageHref && <p className="text-xs text-muted-foreground">{t("install.hint")}</p>}
    </div>
  );
}

/** Streak, this week's workouts, and how long since the last one: three numbers in one row. */
function StatTiles({ stats, t }: { stats: ClientStats; t: T }) {
  const since =
    stats.daysSinceLast == null
      ? "—"
      : stats.daysSinceLast === 0
        ? t("stats.today")
        : stats.daysSinceLast === 1
          ? t("stats.yesterday")
          : t("stats.daysShort", { n: stats.daysSinceLast });

  return (
    <div className="grid grid-cols-3 divide-x divide-border border-y py-3">
      <Tile
        icon={<Flame className="size-3.5" />}
        label={t("stats.streak")}
        value={stats.streakWeeks > 0 ? t("stats.weeksShort", { n: stats.streakWeeks }) : "—"}
        highlight={stats.streakWeeks > 0}
      />
      <Tile icon={<CalendarCheck className="size-3.5" />} label={t("stats.thisWeek")} value={String(stats.last7)} />
      <Tile icon={<History className="size-3.5" />} label={t("stats.last")} value={since} />
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 first:pl-0">
      <div className={`font-display text-3xl leading-none font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {value}
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

/**
 * The next workout as a yellow 15 kg plate: the one bright thing on the
 * screen, so the way into today's training is found without looking for it.
 */
function NextWorkout({
  t,
  programName,
  day,
  progress,
}: {
  t: T;
  programName: string;
  day: ProgramDay;
  progress: { done: number; total: number; weeks: number };
}) {
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
      <p className="text-sm font-medium opacity-75">
        {t("today.next")} · {programName}
      </p>
      <p className="mt-3 font-display text-lg font-medium">
        {t("prog.week", { n: day.week_no })} / {t("prog.day", { n: day.day_no })}
      </p>
      <h2 className="font-display text-[2.6rem] leading-[0.95] font-bold uppercase">
        {day.title || t("prog.day", { n: day.day_no })}
      </h2>

      {day.muscles.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-1.5">
          {day.muscles.slice(0, 4).map((g) => (
            <span key={g} className="rounded-full border border-primary-foreground/30 px-2.5 py-0.5 text-xs font-medium">
              {t(`muscle.${g}`)}
            </span>
          ))}
        </p>
      )}

      <p className="mt-3 text-sm opacity-80">
        {t("prog.exercises", { n: day.exercises })}
        {day.sets > 0 && ` · ${t("today.sets", { n: day.sets })}`}
        {day.minutes > 0 && ` · ${t("today.approxMin", { n: day.minutes })}`}
      </p>

      {progress.total > 0 && (
        <div className="mt-4 space-y-1.5">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>{t("today.dayProgress", { done: progress.done, total: progress.total })}</span>
            <span className="tabular-nums">{percent}%</span>
          </div>
        </div>
      )}

      <Button
        render={<Link to={`/workout/${day.id}`} />}
        className="mt-5 h-14 w-full bg-primary-foreground text-lg text-primary hover:bg-primary-foreground/90"
      >
        <Play className="size-5" fill="currentColor" />
        {t("today.start")}
      </Button>
    </section>
  );
}
