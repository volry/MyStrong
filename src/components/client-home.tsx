import Link from "next/link";
import { CalendarCheck, ChevronRight, Flame, History, PencilRuler, Play, Settings2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Profile } from "@/lib/profile";
import { makeT, type Locale, type T } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";
import { getActiveProgram, getClientStats, type ClientStats, type ProgramDay } from "@/lib/client-data";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MuscleBadges } from "@/components/muscle-badges";

/** Rough session length: a working set plus rest is about three minutes. */
function estimateMinutes(sets: number): number {
  return Math.max(5, Math.round((sets * 3) / 5) * 5);
}

/** "Today" view: next workout of the active program. Used by clients at `/` and by the coach at `/me`. */
export async function ClientHome({
  locale,
  profile,
  flags,
  manageHref,
}: {
  locale: Locale;
  profile: Profile;
  flags: { done?: string; skipped?: string };
  /** Coach only: link to manage their own programs. */
  manageHref?: string;
}) {
  const t = makeT(locale);
  const supabase = await createClient();
  const [data, stats, { data: last }] = await Promise.all([
    getActiveProgram(profile.id),
    getClientStats(profile.id),
    supabase
      .from("workouts")
      .select("id, performed_at, status, program_day:program_days(week_no, day_no, title)")
      .eq("client_id", profile.id)
      .eq("status", "done")
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">
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
                  render={<Link href="/my-programs" />}
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
            <Button render={<Link href="/program" />} variant="outline" className="h-12 w-full text-base">
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
        <Link href={`/history/${last.id}`} className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground">{t("today.lastWorkout")}</div>
            <div className="font-medium">
              {formatDate(last.performed_at, locale)}
              {last.program_day
                ? ` · ${t("prog.week", { n: last.program_day.week_no })} · ${t("prog.day", { n: last.program_day.day_no })}`
                : ""}
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {manageHref && (
        <Button render={<Link href={manageHref} />} variant="outline" className="h-12 w-full text-base">
          <Settings2 className="size-4" />
          {t("me.manage")}
        </Button>
      )}

      {!manageHref && <p className="text-xs text-muted-foreground">{t("install.hint")}</p>}
    </div>
  );
}

/** Streak, this week's workouts, and how long since the last one. */
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
    <div className="grid grid-cols-3 gap-2">
      <Tile
        icon={<Flame className="size-4" />}
        label={t("stats.streak")}
        value={stats.streakWeeks > 0 ? t("stats.weeksShort", { n: stats.streakWeeks }) : "—"}
        highlight={stats.streakWeeks > 0}
      />
      <Tile
        icon={<CalendarCheck className="size-4" />}
        label={t("stats.thisWeek")}
        value={String(stats.last7)}
      />
      <Tile icon={<History className="size-4" />} label={t("stats.last")} value={since} />
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
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={highlight ? "text-primary" : undefined}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

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
    <Card>
      <CardHeader className="gap-2">
        <p className="text-sm text-muted-foreground">
          {t("today.next")} · {programName}
        </p>
        <CardTitle className="text-xl">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
          {day.title ? ` · ${day.title}` : ""}
        </CardTitle>

        <MuscleBadges groups={day.muscles} t={t} />

        <p className="text-sm text-muted-foreground">
          {t("prog.exercises", { n: day.exercises })}
          {day.sets > 0 && ` · ${t("today.sets", { n: day.sets })}`}
          {day.sets > 0 && ` · ${t("today.approxMin", { n: estimateMinutes(day.sets) })}`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {progress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("today.weekOf", { n: day.week_no, total: progress.weeks })} ·{" "}
                {t("today.dayProgress", { done: progress.done, total: progress.total })}
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <Button render={<Link href={`/workout/${day.id}`} />} className="h-14 w-full text-lg">
          <Play className="size-5" fill="currentColor" />
          {t("today.start")}
        </Button>
      </CardContent>
    </Card>
  );
}
