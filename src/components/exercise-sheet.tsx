"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { makeT, type Locale } from "@/i18n/dictionaries";
import type { ExerciseStats } from "@/lib/exercise-stats";
import { formatDate, formatKg } from "@/lib/format";
import { formatWeight, kgToUnit, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { MuscleBadge } from "@/components/muscle-badges";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { TrendChart } from "@/components/trend-chart";

export type SheetExercise = {
  id: string;
  name: string;
  description: string | null;
  youtube_url: string | null;
  muscle_group: string | null;
};

export type SheetTab = "about" | "history" | "charts" | "records";

const TABS: { id: SheetTab; label: "ex.tabAbout" | "ex.tabHistory" | "ex.tabCharts" | "ex.tabRecords" }[] = [
  { id: "about", label: "ex.tabAbout" },
  { id: "history", label: "ex.tabHistory" },
  { id: "charts", label: "ex.tabCharts" },
  { id: "records", label: "ex.tabRecords" },
];

/** Everything known about one exercise: cues and video, past sets, trend, records. */
export function ExerciseSheet({
  exercise,
  stats,
  unit,
  locale,
  tab,
  onTabChange,
  open,
  onOpenChange,
}: {
  exercise: SheetExercise;
  stats: ExerciseStats | undefined;
  unit: Unit;
  locale: Locale;
  tab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = makeT(locale);
  const sessions = stats?.sessions ?? [];
  const records = stats?.records;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-2xl border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl md:inset-x-auto md:left-1/2 md:bottom-8 md:max-h-[80dvh] md:w-[36rem] md:-translate-x-1/2 md:rounded-2xl md:border">
          <div className="flex items-start gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-lg font-semibold">{exercise.name}</Dialog.Title>
              <div className="mt-1">
                <MuscleBadge group={exercise.muscle_group} t={t} />
              </div>
            </div>
            <Dialog.Close
              aria-label={t("ex.close")}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="flex gap-1 border-b px-2 py-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                  tab === item.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                )}
              >
                {t(item.label)}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {tab === "about" && (
              <div className="space-y-3">
                <YoutubeEmbed url={exercise.youtube_url} title={exercise.name} />
                <p className="whitespace-pre-wrap text-sm">
                  {exercise.description || (
                    <span className="text-muted-foreground">{t("ex.noDescription")}</span>
                  )}
                </p>
              </div>
            )}

            {tab === "history" &&
              (sessions.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">{t("ex.noHistory")}</p>
              ) : (
                <ul className="space-y-3">
                  {sessions.map((s) => (
                    <li key={s.workoutId} className="rounded-xl border p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{formatDate(s.date, locale)}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("ex.sessionSets", { n: s.sets.length })}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-sm tabular-nums text-muted-foreground">
                        {s.sets.map((set) => (
                          <div key={set.set_no}>
                            {set.set_no}. {setLabel(set, unit)}
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "charts" &&
              (sessions.length < 2 ? (
                <p className="py-6 text-center text-muted-foreground">{t("ex.noChart")}</p>
              ) : (
                <div className="space-y-5">
                  <TrendChart
                    title={t("ex.chartBest", { unit })}
                    locale={locale}
                    points={[...sessions]
                      .reverse()
                      .filter((s) => s.best != null)
                      .map((s) => ({ date: s.date, value: kgToUnit(s.best as number, unit) }))}
                  />
                  <TrendChart
                    title={t("ex.chartVolume", { unit })}
                    locale={locale}
                    kind="bar"
                    points={[...sessions]
                      .reverse()
                      .filter((s) => s.volume > 0)
                      .map((s) => ({ date: s.date, value: Math.round(kgToUnit(s.volume, unit)) }))}
                  />
                </div>
              ))}

            {tab === "records" &&
              (!records || records.totalSets === 0 ? (
                <p className="py-6 text-center text-muted-foreground">{t("ex.noHistory")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Record label={t("ex.recBestSet")} value={weightValue(records.bestWeight, unit)} />
                  <Record label={t("ex.recE1rm")} value={weightValue(records.bestE1rm, unit)} />
                  <Record
                    label={t("ex.recVolume")}
                    value={
                      records.bestVolume != null
                        ? `${Math.round(kgToUnit(records.bestVolume, unit))} ${unit}`
                        : "—"
                    }
                  />
                  <Record label={t("ex.recReps")} value={records.bestReps != null ? String(records.bestReps) : "—"} />
                  {records.bestTime != null && (
                    <Record label={t("ex.recTime")} value={`${records.bestTime} s`} />
                  )}
                  <Record label={t("ex.recSets")} value={String(records.totalSets)} />
                  <Record label={t("ex.recSessions")} value={String(records.sessions)} />
                </div>
              ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function setLabel(
  set: { reps: number | null; weight: number | null; time_sec: number | null },
  unit: Unit,
): string {
  const weight = set.weight != null ? `${formatWeight(set.weight, unit)} ${unit}` : null;
  const work = set.reps != null ? `${set.reps}` : set.time_sec != null ? `${set.time_sec} s` : null;
  if (weight && work) return `${weight} × ${work}`;
  return weight ?? work ?? "—";
}

function weightValue(kg: number | null, unit: Unit): string {
  return kg != null ? `${formatKg(kgToUnit(kg, unit))} ${unit}` : "—";
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
