import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useData } from "@/data/store";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { dayItems, findDay } from "@/lib/client-data";
import { getExerciseStats } from "@/lib/exercise-stats";
import { WorkoutForm } from "@/components/workout-form";
import { rowsFromSets, type PrevSet, type WorkoutItem } from "@/lib/workout-rows";
import type { Exercise, Workout } from "@/data/types";

/**
 * The day's exercises as the form needs them. A day deleted since (or exercises
 * removed from it) still leaves the logged sets editable, rebuilt from the sets.
 */
function itemsFor(w: Workout, programs: Parameters<typeof findDay>[0], library: Map<string, Exercise>): WorkoutItem[] {
  const found = findDay(programs, w.program_day_id);
  const items = found ? dayItems(found.day, library) : [];
  const known = new Set(items.map((i) => i.id));
  for (const s of w.sets) {
    if (known.has(s.program_exercise_id)) continue;
    known.add(s.program_exercise_id);
    const e = s.exercise_id ? library.get(s.exercise_id) : undefined;
    items.push({
      id: s.program_exercise_id,
      target_sets: null,
      target_reps: null,
      target_weight: null,
      target_time_sec: null,
      target_rpe: null,
      coach_notes: null,
      exercise: e
        ? { id: e.id, name: e.name, youtube_url: e.youtube_url, description: e.description, muscle_group: e.muscle_group }
        : null,
    });
  }
  return items;
}

export default function EditWorkoutPage() {
  const { me: profile, workouts, programs, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id } = useParams();

  const w = workouts.find((x) => x.id === id);
  const items = useMemo(() => (w ? itemsFor(w, programs, exercises) : []), [w, programs, exercises]);
  const stats = useMemo(
    () =>
      w
        ? getExerciseStats(
            w.client_id,
            workouts,
            items.map((i) => i.exercise?.id).filter((x): x is string => Boolean(x)),
          )
        : {},
    [w, workouts, items],
  );

  if (!w || (w.client_id !== profile.id && profile.role !== "coach")) return <Navigate to="/history" replace />;

  const saved: Record<string, PrevSet[]> = {};
  for (const s of w.sets) {
    (saved[s.program_exercise_id] ??= []).push({
      set_no: s.set_no,
      reps: s.reps,
      weight: s.weight,
      time_sec: s.time_sec,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/history/${w.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {formatDate(w.performed_at, locale)}
        </Link>
        <h1 className="text-[2rem] leading-tight font-bold">{t("history.edit")}</h1>
        {w.day && (
          <p className="text-muted-foreground">
            {t("prog.week", { n: w.day.week_no })} · {t("prog.day", { n: w.day.day_no })}
            {w.day.title ? ` · ${w.day.title}` : ""}
          </p>
        )}
      </div>

      <WorkoutForm
        key={w.id}
        mode="edit"
        stats={stats}
        locale={locale}
        unit={profile.unit}
        dayId={w.program_day_id}
        items={items}
        previous={{}}
        canLog
        workoutId={w.id}
        initialRows={rowsFromSets(items, saved, profile.unit)}
        initialComment={w.client_comment ?? ""}
        initialDate={w.performed_at}
        initialNotes={Object.fromEntries(w.notes.map((n) => [n.program_exercise_id, n.note]))}
      />
    </div>
  );
}
