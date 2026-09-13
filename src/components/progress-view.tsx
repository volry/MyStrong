"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Search } from "lucide-react";
import { makeT, MUSCLE_GROUPS, type Locale, type MuscleGroup, type T } from "@/i18n/dictionaries";
import type { ExerciseProgress, ProgressSummary } from "@/lib/progress";
import { isMuscleGroup } from "@/lib/muscles";
import { formatWeight, kgToUnit, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MuscleBadge } from "@/components/muscle-badges";

// Series color validated with the dataviz palette checker (light surface).
const SERIES = "#0d9488";
const GRID = "#e5e5e5";
const AXIS_TEXT = "#737373";

/** How many exercise cards to render before "Show more" — each one is a chart. */
const PAGE = 6;

type Metric = "best" | "volume" | "e1rm";
type Sort = "recent" | "name" | "most";

function shortDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function ProgressView({
  summary,
  unit,
  locale,
}: {
  summary: ProgressSummary;
  unit: Unit;
  locale: Locale;
}) {
  const t = makeT(locale);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [metric, setMetric] = useState<Metric>("best");
  const [sort, setSort] = useState<Sort>("recent");
  const [repeatedOnly, setRepeatedOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  // Only offer groups the person has actually trained.
  const groups = useMemo(() => {
    const present = new Set(summary.exercises.map((e) => e.muscleGroup).filter(isMuscleGroup));
    return MUSCLE_GROUPS.filter((g) => present.has(g));
  }, [summary.exercises]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = summary.exercises.filter((e) => {
      if (group && e.muscleGroup !== group) return false;
      if (repeatedOnly && e.points.length < 2) return false;
      if (needle && !e.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "most") return [...list].sort((a, b) => b.points.length - a.points.length);
    return list; // already most-recent first from the query
  }, [summary.exercises, query, group, repeatedOnly, sort]);

  // Any filter change starts the list from the top again.
  function change<V>(set: (v: V) => void) {
    return (value: V) => {
      set(value);
      setShown(PAGE);
    };
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t("progress.thisMonth")} value={String(summary.workoutsThisMonth)} sub={t("progress.workouts")} />
        <Tile label={t("progress.streak")} value={String(summary.streakWeeks)} sub={t("progress.weeks")} />
        <Tile label={t("progress.total")} value={String(summary.totalWorkouts)} sub={t("progress.workouts")} />
      </div>

      {summary.exercises.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{t("progress.empty")}</p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => change(setQuery)(e.target.value)}
              placeholder={t("progress.search")}
              className="h-11 pl-9 text-base"
            />
          </div>

          {groups.length > 1 && (
            <Scroller>
              <Chip label={t("ex.allGroups")} active={!group} onClick={() => change(setGroup)(null)} />
              {groups.map((g) => (
                <Chip
                  key={g}
                  label={t(`muscle.${g}`)}
                  active={group === g}
                  onClick={() => change(setGroup)(group === g ? null : g)}
                />
              ))}
            </Scroller>
          )}

          <Scroller>
            <Segmented
              label={t("progress.metric")}
              value={metric}
              onChange={change(setMetric)}
              options={[
                ["best", t("progress.bestEver")],
                ["volume", t("progress.volume")],
                ["e1rm", t("progress.e1rm")],
              ]}
            />
          </Scroller>
          {metric !== "best" && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {metric === "volume" ? t("progress.volumeHint") : t("progress.e1rmHint")}
            </p>
          )}

          <div className="flex items-center gap-2">
            <select
              aria-label={t("progress.sort")}
              value={sort}
              onChange={(e) => change(setSort)(e.target.value as Sort)}
              className="h-9 shrink-0 rounded-full border border-border bg-background px-3 text-sm text-muted-foreground"
            >
              <option value="recent">{t("progress.sortRecent")}</option>
              <option value="name">{t("progress.sortName")}</option>
              <option value="most">{t("progress.sortMost")}</option>
            </select>
            <Chip
              label={t("progress.repeatedOnly")}
              active={repeatedOnly}
              onClick={() => change(setRepeatedOnly)(!repeatedOnly)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t("progress.noMatch")}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("progress.count", { n: Math.min(shown, filtered.length), total: filtered.length })}
              </p>
              <ul className="space-y-3">
                {filtered.slice(0, shown).map((e) => (
                  <li key={e.exerciseId}>
                    <ExerciseCard exercise={e} metric={metric} unit={unit} locale={locale} t={t} />
                  </li>
                ))}
              </ul>
              {shown < filtered.length && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="h-11 w-full rounded-xl border text-sm font-medium"
                >
                  {t("progress.showMore")}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/** A row of controls that can run off the edge of a phone screen. */
function Scroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max items-center gap-2 pb-1">{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function Segmented<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: [V, string][];
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex rounded-full border p-0.5" role="group">
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
              value === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border px-3 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** One exercise: its numbers, and the chosen measure over time. */
function ExerciseCard({
  exercise,
  metric,
  unit,
  locale,
  t,
}: {
  exercise: ExerciseProgress;
  metric: Metric;
  unit: Unit;
  locale: Locale;
  t: T;
}) {
  const data = exercise.points.map((p) => ({
    label: shortDate(p.date, locale),
    sets: p.sets,
    value:
      metric === "volume"
        ? Math.round(kgToUnit(p.volume, unit))
        : metric === "e1rm"
          ? p.e1rm != null
            ? Math.round(kgToUnit(p.e1rm, unit))
            : null
          : p.best != null
            ? Math.round(kgToUnit(p.best, unit) * 4) / 4
            : null,
  }));
  const hasValues = data.some((d) => d.value != null);
  const axis = { tick: { fontSize: 11, fill: AXIS_TEXT }, tickLine: false, axisLine: false } as const;

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{exercise.name}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("progress.sessions", { n: exercise.points.length })}
            {exercise.lastDate && ` · ${t("progress.lastTrained", { date: shortDate(exercise.lastDate, locale) })}`}
          </p>
        </div>
        <MuscleBadge group={exercise.muscleGroup} t={t} />
      </div>

      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>
          {t("progress.bestEver")}:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {exercise.bestEver != null ? `${formatWeight(exercise.bestEver, unit)} ${unit}` : "—"}
          </span>
        </span>
        <span>
          {t("progress.e1rm")}:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {exercise.e1rmBest != null ? `${formatWeight(exercise.e1rmBest, unit)} ${unit}` : "—"}
          </span>
        </span>
      </div>

      {!hasValues ? (
        <p className="py-6 text-center text-xs text-muted-foreground">{t("progress.noWeight")}</p>
      ) : (
        <div className="-ml-2 mt-2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            {metric === "volume" ? (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" minTickGap={24} {...axis} />
                <YAxis width={44} {...axis} />
                <Tooltip content={<PointTooltip unit={unit} t={t} />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" minTickGap={24} {...axis} />
                <YAxis width={36} domain={["auto", "auto"]} {...axis} />
                <Tooltip content={<PointTooltip unit={unit} t={t} />} cursor={{ stroke: GRID }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={SERIES}
                  strokeWidth={2}
                  dot={{ r: 4, fill: SERIES, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type TooltipPayload = { payload?: { label: string; value: number | null; sets: number } };

function PointTooltip({
  active,
  payload,
  unit,
  t,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: Unit;
  t: T;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <div className="text-muted-foreground">{p.label}</div>
      <div className="font-medium tabular-nums">
        {p.value != null ? `${p.value} ${unit}` : "—"} · {p.sets} {t("progress.setsShort")}
      </div>
    </div>
  );
}
