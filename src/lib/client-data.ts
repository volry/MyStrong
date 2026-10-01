import type { Exercise, Program, ProgramDayDoc, Workout } from "@/data/types";
import type { PrevSet, WorkoutItem } from "@/lib/workout-rows";
import { muscleSummary } from "@/lib/muscles";
import { weekStreak } from "@/lib/week";
import type { MuscleGroup } from "@/i18n/dictionaries";

export type ProgramDay = {
  id: string;
  week_no: number;
  day_no: number;
  title: string | null;
  /** How much work the day holds, for previews. */
  exercises: number;
  sets: number;
  /** Rough length of the session, minutes. */
  minutes: number;
  muscles: MuscleGroup[];
};

/**
 * A weighted set is about two and a half minutes with its rest; a timed one costs
 * its own duration plus a short break. Warm-ups and cardio are timed, so counting
 * them as plain sets would hide a 15-minute walk behind "3 min".
 */
function estimateMinutes(
  rows: { target_sets: number | null; target_time_sec: number | null }[],
): number {
  const minutes = rows.reduce((total, pe) => {
    const sets = pe.target_sets ?? 1;
    const perSet = pe.target_time_sec != null ? pe.target_time_sec / 60 + 0.5 : 2.5;
    return total + sets * perSet;
  }, 0);
  return Math.round(minutes / 5) * 5;
}

/** A day's exercises joined with the library, in the shape the workout form reads. */
export function dayItems(day: ProgramDayDoc, library: Map<string, Exercise>): WorkoutItem[] {
  return day.items.map((i) => {
    const e = library.get(i.exercise_id);
    return {
      id: i.id,
      target_sets: i.target_sets,
      target_reps: i.target_reps,
      target_weight: i.target_weight,
      target_time_sec: i.target_time_sec,
      target_rpe: i.target_rpe,
      coach_notes: i.coach_notes,
      exercise: e
        ? { id: e.id, name: e.name, youtube_url: e.youtube_url, description: e.description, muscle_group: e.muscle_group }
        : null,
    };
  });
}

/** Days in program order. */
export function sortedDays<T extends { week_no: number; day_no: number }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.week_no - b.week_no || a.day_no - b.day_no);
}

/** The program a day belongs to, and the day. */
export function findDay(programs: Program[], dayId: string) {
  for (const program of programs) {
    const day = program.days.find((d) => d.id === dayId);
    if (day) return { program, day };
  }
  return null;
}

/** The client's active program with its days, which days are done, and the next day to do. */
export function getActiveProgram(
  clientId: string,
  programs: Program[],
  workouts: Workout[],
  library: Map<string, Exercise>,
) {
  const program = programs.find((p) => p.client_id === clientId && p.is_active);
  if (!program) return null;

  // dayId -> most recent performed_at of a *done* workout
  const doneMap = new Map<string, string>();
  // days that were done or skipped: the "next" pointer moves past them
  const passed = new Set<string>();
  // workouts arrive newest first
  for (const w of workouts) {
    if (w.client_id !== clientId) continue;
    passed.add(w.program_day_id);
    if (w.status === "done" && !doneMap.has(w.program_day_id)) {
      doneMap.set(w.program_day_id, w.performed_at);
    }
  }

  const days: ProgramDay[] = sortedDays(program.days).map((d) => {
    const items = d.items.map((i) => ({
      target_sets: i.target_sets,
      target_time_sec: i.target_time_sec,
      exercise: { muscle_group: library.get(i.exercise_id)?.muscle_group ?? null },
    }));
    return {
      id: d.id,
      week_no: d.week_no,
      day_no: d.day_no,
      title: d.title,
      exercises: items.length,
      sets: items.reduce((n, pe) => n + (pe.target_sets ?? 0), 0),
      minutes: estimateMinutes(items),
      muscles: muscleSummary(items),
    };
  });

  const nextDay = days.find((d) => !passed.has(d.id)) ?? null;
  const weeks = days.reduce((max, d) => Math.max(max, d.week_no), 0);

  return {
    program: {
      id: program.id,
      name: program.name,
      start_date: program.start_date,
      notes: program.notes,
      created_by: program.created_by,
      review_status: program.review_status,
    },
    days,
    doneMap,
    nextDay,
    /** How far through the program the client is. */
    progress: { done: doneMap.size, total: days.length, weeks },
  };
}

export type ClientStats = {
  /** Consecutive weeks with at least one workout. */
  streakWeeks: number;
  last7: number;
  daysSinceLast: number | null;
  total: number;
};

/** Counters for the Today screen. */
export function getClientStats(clientId: string, workouts: Workout[]): ClientStats {
  const dates = workouts
    .filter((w) => w.client_id === clientId && w.status === "done")
    .map((w) => w.performed_at)
    .sort((a, b) => b.localeCompare(a));
  const now = Date.now();
  const day = 86400000;
  const last7 = dates.filter((d) => now - new Date(d).getTime() < 7 * day).length;
  const daysSinceLast =
    dates.length > 0 ? Math.floor((now - new Date(dates[0]).getTime()) / day) : null;

  return { streakWeeks: weekStreak(dates), last7, daysSinceLast, total: dates.length };
}

/** exercise id -> sets from the most recent done workout that included it; prefills "last time". */
export function previousSets(clientId: string, workouts: Workout[]): Record<string, PrevSet[]> {
  const previous: Record<string, PrevSet[]> = {};
  for (const w of workouts) {
    if (w.client_id !== clientId || w.status !== "done") continue;
    const byExercise = new Map<string, PrevSet[]>();
    for (const s of w.sets) {
      if (!s.exercise_id) continue;
      const list = byExercise.get(s.exercise_id) ?? [];
      list.push({ set_no: s.set_no, reps: s.reps, weight: s.weight, time_sec: s.time_sec });
      byExercise.set(s.exercise_id, list);
    }
    for (const [exId, sets] of byExercise) {
      if (!previous[exId]) previous[exId] = sets.sort((a, b) => a.set_no - b.set_no);
    }
  }
  return previous;
}
