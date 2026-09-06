"use client";

import { useState } from "react";
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
import { makeT, type Locale } from "@/i18n/dictionaries";
import type { ExerciseProgress, ProgressSummary } from "@/lib/progress";
import { formatWeight, kgToUnit, type Unit } from "@/lib/units";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Series color validated with the dataviz palette checker (light surface).
const SERIES = "#0d9488";
const GRID = "#e5e5e5";
const AXIS_TEXT = "#737373";

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
  const [selectedId, setSelectedId] = useState(summary.exercises[0]?.exerciseId ?? "");
  const selected = summary.exercises.find((e) => e.exerciseId === selectedId);

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
          <div className="space-y-1">
            <label htmlFor="exercise" className="text-sm font-medium">
              {t("progress.pick")}
            </label>
            <select
              id="exercise"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
            >
              {summary.exercises.map((e) => (
                <option key={e.exerciseId} value={e.exerciseId}>
                  {e.name} ({e.points.length})
                </option>
              ))}
            </select>
          </div>

          {selected && <ExerciseCharts exercise={selected} unit={unit} locale={locale} />}
        </>
      )}
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

function ExerciseCharts({
  exercise,
  unit,
  locale,
}: {
  exercise: ExerciseProgress;
  unit: Unit;
  locale: Locale;
}) {
  const t = makeT(locale);
  const data = exercise.points.map((p) => ({
    date: p.date,
    label: shortDate(p.date, locale),
    best: p.best != null ? Math.round(kgToUnit(p.best, unit) * 4) / 4 : null,
    volume: Math.round(kgToUnit(p.volume, unit)),
    sets: p.sets,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Tile
          label={t("progress.bestEver")}
          value={exercise.bestEver != null ? `${formatWeight(exercise.bestEver, unit)} ${unit}` : "—"}
        />
        <Tile
          label={t("progress.e1rm")}
          value={exercise.e1rmBest != null ? `${formatWeight(exercise.e1rmBest, unit)} ${unit}` : "—"}
          sub={t("progress.e1rmHint")}
        />
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium">{t("progress.bestChart", { unit })}</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: AXIS_TEXT }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  width={36}
                  tick={{ fontSize: 11, fill: AXIS_TEXT }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<PointTooltip unit={unit} valueKey="best" />} cursor={{ stroke: GRID }} />
                <Line
                  type="monotone"
                  dataKey="best"
                  stroke={SERIES}
                  strokeWidth={2}
                  dot={{ r: 4, fill: SERIES, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium">{t("progress.volumeChart", { unit })}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("progress.volumeHint")}</p>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: AXIS_TEXT }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis width={44} tick={{ fontSize: 11, fill: AXIS_TEXT }} tickLine={false} axisLine={false} />
                <Tooltip content={<PointTooltip unit={unit} valueKey="volume" />} cursor={{ fill: "#f5f5f5" }} />
                <Bar dataKey="volume" fill={SERIES} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type TooltipPayload = { payload?: { label: string; best: number | null; volume: number; sets: number } };

function PointTooltip({
  active,
  payload,
  unit,
  valueKey,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: Unit;
  valueKey: "best" | "volume";
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const value = valueKey === "best" ? p.best : p.volume;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <div className="text-muted-foreground">{p.label}</div>
      <div className="font-medium tabular-nums">
        {value != null ? `${value} ${unit}` : "—"} · {p.sets} sets
      </div>
    </div>
  );
}
