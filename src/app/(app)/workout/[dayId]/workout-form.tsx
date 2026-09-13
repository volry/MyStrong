"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BarChart3, Check, MessageSquare, Plus } from "lucide-react";
import { makeT, type Locale, type TranslationKey } from "@/i18n/dictionaries";

import { formatTarget } from "@/lib/format";
import { formatWeight, kgToUnit, unitToKg, type Unit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MuscleBadge } from "@/components/muscle-badges";
import { RestTimer, type RestTimerHandle } from "@/components/rest-timer";
import { ExerciseSheet, type SheetTab } from "@/components/exercise-sheet";
import type { ExerciseStats } from "@/lib/exercise-stats";
import { DEFAULT_FOCUS, FOCUS_LABEL, focusTotals, type FocusMetric } from "@/lib/focus-metric";
import { FocusMetricPicker, formatFocus } from "@/components/focus-metric-picker";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { finishWorkout, setFocusMetric, skipDay, updateWorkout, type NoteInput, type SetInput } from "../actions";

import type { PrevSet, Row, WorkoutItem } from "@/lib/workout-rows";
export type { PrevSet, Row, WorkoutItem };

type Draft = { rows: Record<string, Row[]>; comment: string; notes?: Record<string, string> };

function usesTime(item: WorkoutItem) {
  return item.target_time_sec != null && item.target_reps == null;
}

/** Rows for a fresh workout: last time's sets, else the targets. */
function buildRows(items: WorkoutItem[], previous: Record<string, PrevSet[]>, unit: Unit) {
  const rows: Record<string, Row[]> = {};
  for (const item of items) {
    const prev = item.exercise ? previous[item.exercise.id] : undefined;
    const n = Math.max(item.target_sets ?? 0, prev?.length ?? 0, 1);
    rows[item.id] = Array.from({ length: n }, (_, k) => {
      const p = prev?.[k];
      return {
        weight:
          p?.weight != null
            ? formatWeight(p.weight, unit)
            : item.target_weight != null
              ? formatWeight(item.target_weight, unit)
              : "",
        reps: p?.reps != null ? String(p.reps) : item.target_reps != null ? String(item.target_reps) : "",
        time:
          p?.time_sec != null
            ? String(p.time_sec)
            : item.target_time_sec != null
              ? String(item.target_time_sec)
              : "",
        done: false,
      };
    });
  }
  return rows;
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Keep the original time of day, replace the calendar date (local time). */
function withDate(originalIso: string, dateStr: string): string {
  const d = new Date(originalIso);
  const [y, m, day] = dateStr.split("-").map(Number);
  if (!y || !m || !day) return originalIso;
  d.setFullYear(y, m - 1, day);
  return d.toISOString();
}

function prevLabel(p: PrevSet | undefined, timeMode: boolean, unit: Unit): string {
  if (!p) return "—";
  const w = p.weight != null ? formatWeight(p.weight, unit) : null;
  const r = timeMode ? (p.time_sec != null ? `${p.time_sec}s` : null) : p.reps != null ? String(p.reps) : null;
  if (w && r) return `${w}×${r}`;
  return w ?? r ?? "—";
}

type Props = {
  locale: Locale;
  unit: Unit;
  dayId: string;
  items: WorkoutItem[];
  previous: Record<string, PrevSet[]>;
  canLog: boolean;
  /** Rest countdown after each ticked set, seconds. 0 = the client turned it off. */
  restTimerSec?: number;
  /** History and records per exercise id, for the exercise sheet. */
  stats?: Record<string, ExerciseStats>;
  /** The metric this client watches, per exercise id. */
  focus?: Record<string, FocusMetric>;
  /** Coach logging for a client: the workout is saved under this client. */
  clientId?: string;
} & (
  | { mode?: "log" }
  | {
      mode: "edit";
      workoutId: string;
      initialRows: Record<string, Row[]>;
      initialComment: string;
      initialDate: string;
      initialNotes: Record<string, string>;
    }
);

export function WorkoutForm(props: Props) {
  const {
    locale,
    unit,
    dayId,
    items,
    previous,
    canLog,
    clientId,
    restTimerSec = 0,
    stats,
    focus: savedFocus,
  } = props;
  const isEdit = props.mode === "edit";
  const t = makeT(locale);
  const draftKey = `mystrong:draft:${dayId}:${clientId ?? "me"}`;
  const [rows, setRows] = useState<Record<string, Row[]>>(() =>
    props.mode === "edit" ? props.initialRows : buildRows(items, previous, unit),
  );
  const [comment, setComment] = useState(props.mode === "edit" ? props.initialComment : "");
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    props.mode === "edit" ? props.initialNotes : {},
  );
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    if (props.mode === "edit") for (const id of Object.keys(props.initialNotes)) open[id] = true;
    return open;
  });
  const [date, setDate] = useState("");
  const [error, setError] = useState<TranslationKey | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  const restRef = useRef<RestTimerHandle | null>(null);
  const [sheet, setSheet] = useState<{ itemId: string; tab: SheetTab } | null>(null);
  const [focusPicker, setFocusPicker] = useState<string | null>(null);
  const [focus, setFocus] = useState<Record<string, FocusMetric>>(savedFocus ?? {});

  // After mount: restore an unfinished draft (log mode) or compute the local date (edit mode).
  // localStorage and the local timezone are only available in the browser, hence an effect.
  useEffect(() => {
    const init = () => {
      if (props.mode === "edit") {
        setDate(toLocalDateString(props.initialDate));
      } else {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw) as Draft;
            setRows((current) => {
              const merged = { ...current };
              for (const [id, saved] of Object.entries(draft.rows ?? {})) {
                if (merged[id]) merged[id] = saved;
              }
              return merged;
            });
            setComment(draft.comment ?? "");
            if (draft.notes) {
              setNotes(draft.notes);
              setNoteOpen(Object.fromEntries(Object.keys(draft.notes).map((id) => [id, true])));
            }
          }
        } catch {
          // ignore corrupt drafts
        }
      }
      setHydrated(true);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (!hydrated || isEdit) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ rows, comment, notes } satisfies Draft));
    } catch {
      // storage unavailable
    }
  }, [rows, comment, notes, hydrated, isEdit, draftKey]);

  function updateRow(itemId: string, index: number, patch: Partial<Row>) {
    setRows((r) => ({
      ...r,
      [itemId]: r[itemId].map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  /** Ticking a set (never un-ticking) starts the rest countdown, when it is on. */
  function toggleDone(itemId: string, index: number, done: boolean) {
    updateRow(itemId, index, { done });
    if (done && restTimerSec > 0 && !isEdit) restRef.current?.start(restTimerSec);
  }

  function addRow(itemId: string) {
    setRows((r) => {
      const list = r[itemId];
      const last = list[list.length - 1];
      return { ...r, [itemId]: [...list, { ...last, done: false }] };
    });
  }

  function markAll(itemId: string) {
    setRows((r) => ({ ...r, [itemId]: r[itemId].map((row) => ({ ...row, done: true })) }));
  }

  function collectSets(): SetInput[] {
    const sets: SetInput[] = [];
    for (const item of items) {
      const done = rows[item.id].filter((row) => row.done);
      done.forEach((row, i) => {
        const w = parseNum(row.weight);
        sets.push({
          program_exercise_id: item.id,
          set_no: i + 1,
          reps: usesTime(item) ? null : (parseNum(row.reps) ?? null),
          weight: w != null ? unitToKg(w, unit) : null,
          time_sec: usesTime(item) ? (parseNum(row.time) ?? null) : null,
        });
      });
    }
    return sets;
  }

  function collectNotes(): NoteInput[] {
    return Object.entries(notes)
      .filter(([, note]) => note.trim().length > 0)
      .map(([program_exercise_id, note]) => ({ program_exercise_id, note: note.trim() }));
  }

  function submit() {
    setError(null);
    const sets = collectSets();
    if (sets.length === 0) {
      setError("workout.noSets");
      return;
    }
    const noteList = collectNotes();
    startTransition(async () => {
      const result =
        props.mode === "edit"
          ? await updateWorkout({
              workoutId: props.workoutId,
              comment,
              performedAt: date ? withDate(props.initialDate, date) : props.initialDate,
              sets,
              notes: noteList,
            })
          : await finishWorkout({ dayId, comment, sets, notes: noteList, clientId });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (!isEdit) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
    });
  }

  const sheetExercise = sheet ? (items.find((i) => i.id === sheet.itemId)?.exercise ?? null) : null;
  const pickerItem = focusPicker ? (items.find((i) => i.id === focusPicker) ?? null) : null;

  /** The metric chosen for an exercise, falling back to total volume. */
  function metricOf(itemId: string): FocusMetric {
    const exerciseId = items.find((i) => i.id === itemId)?.exercise?.id;
    return (exerciseId ? focus[exerciseId] : undefined) ?? DEFAULT_FOCUS;
  }

  /** Today's numbers for an exercise, from the sets ticked so far. */
  function totalsOf(item: WorkoutItem) {
    const ticked = (rows[item.id] ?? [])
      .filter((row) => row.done)
      .map((row) => ({ weight: parseNum(row.weight), reps: parseNum(row.reps) }));
    // Last session's volume, converted into the unit the inputs use.
    const last = item.exercise ? stats?.[item.exercise.id]?.sessions[0] : undefined;
    const previousVolume = last && last.volume > 0 ? kgToUnit(last.volume, unit) : null;
    return focusTotals(ticked, previousVolume);
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-input bg-background px-1 text-center text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const gridCols = isEdit
    ? "grid-cols-[2rem_1fr_1fr_2.75rem]"
    : "grid-cols-[2rem_3.75rem_1fr_1fr_2.75rem]";

  return (
    <div className="space-y-4">
      {isEdit ? (
        hydrated && (
          <div className="space-y-1">
            <label htmlFor="performed_at" className="text-sm font-medium">
              {t("workout.date")}
            </label>
            <Input
              id="performed_at"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground">{t("workout.tickHint")}</p>
      )}

      {items.map((item, idx) => {
        const timeMode = usesTime(item);
        const prev = !isEdit && item.exercise ? previous[item.exercise.id] : undefined;
        const open = noteOpen[item.id] ?? false;
        const note = notes[item.id] ?? "";
        return (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  <button
                    type="button"
                    onClick={() => item.exercise && setSheet({ itemId: item.id, tab: "about" })}
                    className="text-left text-primary underline-offset-4 hover:underline"
                  >
                    {idx + 1}. {item.exercise?.name}
                  </button>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => item.exercise && setFocusPicker(item.id)}
                  aria-label={t("focus.title")}
                  title={t("focus.title")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border text-muted-foreground"
                >
                  <BarChart3 className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MuscleBadge group={item.exercise?.muscle_group} t={t} />
                <p className="text-sm text-muted-foreground">
                  {t("workout.target")}: {formatTarget(item) || "—"}
                </p>
              </div>
              {item.exercise && !timeMode && (
                <button
                  type="button"
                  onClick={() => setFocusPicker(item.id)}
                  className="flex w-fit items-center gap-1.5 text-sm"
                >
                  <span className="text-muted-foreground">{t(FOCUS_LABEL[metricOf(item.id)])}:</span>
                  <span className="font-semibold tabular-nums">
                    {formatFocus(metricOf(item.id), totalsOf(item), t, unit)}
                  </span>
                </button>
              )}
              {item.coach_notes && <p className="text-sm">{item.coach_notes}</p>}
              <YoutubeEmbed
                url={item.exercise?.youtube_url}
                title={item.exercise?.name}
                collapsedLabel={t("workout.video")}
                expandedLabel={t("workout.hideVideo")}
              />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className={cn("grid items-center gap-2 text-xs text-muted-foreground", gridCols)}>
                <span>{t("workout.set")}</span>
                {!isEdit && <span className="text-center">{t("workout.prev")}</span>}
                <span className="text-center">
                  {t("workout.weight")} ({unit})
                </span>
                <span className="text-center">{timeMode ? t("workout.time") : t("workout.reps")}</span>
                <span />
              </div>
              {rows[item.id].map((row, i) => (
                <div key={i} className={cn("grid items-center gap-2", gridCols)}>
                  <div className="text-center font-medium">{i + 1}</div>
                  {!isEdit && (
                    <div className="truncate text-center text-xs tabular-nums text-muted-foreground">
                      {prevLabel(prev?.[i], timeMode, unit)}
                    </div>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    value={row.weight}
                    onChange={(e) => updateRow(item.id, i, { weight: e.target.value })}
                    className={cn(inputClass, row.done && "bg-primary/10")}
                    aria-label={`${t("workout.set")} ${i + 1} ${t("workout.weight")}`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={timeMode ? row.time : row.reps}
                    onChange={(e) =>
                      updateRow(item.id, i, timeMode ? { time: e.target.value } : { reps: e.target.value })
                    }
                    className={cn(inputClass, row.done && "bg-primary/10")}
                    aria-label={`${t("workout.set")} ${i + 1} ${timeMode ? t("workout.time") : t("workout.reps")}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleDone(item.id, i, !row.done)}
                    aria-pressed={row.done}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
                      row.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground",
                    )}
                  >
                    <Check className="size-5" strokeWidth={3} />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => addRow(item.id)}
                  className="inline-flex items-center gap-1 text-sm text-primary"
                >
                  <Plus className="size-4" />
                  {t("workout.addSet")}
                </button>
                {canLog && (
                  <button
                    type="button"
                    onClick={() => setNoteOpen((o) => ({ ...o, [item.id]: !open }))}
                    aria-expanded={open}
                    className={cn(
                      "inline-flex items-center gap-1 text-sm",
                      note ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <MessageSquare className="size-4" />
                    {note && !open ? note.slice(0, 24) + (note.length > 24 ? "…" : "") : t("workout.note")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => markAll(item.id)}
                  className="text-sm text-muted-foreground"
                >
                  {t("workout.markAll")}
                </button>
              </div>
              {canLog && open && (
                <Input
                  value={note}
                  maxLength={500}
                  autoFocus={!note}
                  placeholder={t("workout.notePlaceholder")}
                  onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                  className="h-10 text-sm"
                  aria-label={t("workout.note")}
                />
              )}
            </CardContent>
          </Card>
        );
      })}

      {canLog && (
        <>
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              {t("workout.comment")}
            </label>
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("workout.commentHint")}
              className="text-base"
            />
          </div>

          {error && <p className="text-sm text-destructive">{t(error)}</p>}

          <Button type="button" onClick={submit} disabled={pending} className="h-14 w-full text-lg">
            {pending ? t("workout.finishing") : isEdit ? t("workout.saveChanges") : t("workout.finish")}
          </Button>

          {!isEdit && (
            <form action={skipDay} className="pt-2">
              <input type="hidden" name="day_id" value={dayId} />
              {clientId && <input type="hidden" name="client_id" value={clientId} />}
              <ConfirmButton
                type="submit"
                variant="ghost"
                className="w-full text-muted-foreground"
                message={t("common.confirmDelete")}
              >
                {t("workout.skip")}
              </ConfirmButton>
            </form>
          )}
        </>
      )}

      {restTimerSec > 0 && !isEdit && (
        <RestTimer t={t} onReady={(handle) => (restRef.current = handle)} />
      )}

      {pickerItem?.exercise && (
        <FocusMetricPicker
          t={t}
          exerciseName={pickerItem.exercise.name}
          totals={totalsOf(pickerItem)}
          unit={unit}
          selected={metricOf(pickerItem.id)}
          onSelect={(metric) => {
            const exerciseId = pickerItem.exercise?.id;
            if (!exerciseId) return;
            setFocus((f) => ({ ...f, [exerciseId]: metric }));
            void setFocusMetric(exerciseId, metric, clientId);
          }}
          open={focusPicker != null}
          onOpenChange={(open) => !open && setFocusPicker(null)}
        />
      )}

      {sheetExercise && (
        <ExerciseSheet
          exercise={sheetExercise}
          stats={stats?.[sheetExercise.id]}
          unit={unit}
          locale={locale}
          tab={sheet?.tab ?? "about"}
          onTabChange={(tab) => setSheet((s) => (s ? { ...s, tab } : s))}
          open={sheet != null}
          onOpenChange={(open) => !open && setSheet(null)}
        />
      )}
    </div>
  );
}
