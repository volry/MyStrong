import { createClient } from "@/lib/supabase/server";

export type ExerciseSet = {
  set_no: number;
  reps: number | null;
  weight: number | null;
  time_sec: number | null;
};

export type ExerciseSession = {
  workoutId: string;
  date: string;
  sets: ExerciseSet[];
  /** Heaviest set of that day, kg. */
  best: number | null;
  volume: number;
  e1rm: number | null;
};

export type ExerciseRecords = {
  bestWeight: number | null;
  bestE1rm: number | null;
  bestVolume: number | null;
  bestReps: number | null;
  bestTime: number | null;
  totalSets: number;
  sessions: number;
};

export type ExerciseStats = {
  /** Newest first. */
  sessions: ExerciseSession[];
  records: ExerciseRecords;
};

/** Epley estimate; only meaningful for 1–12 reps. */
function epley(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/**
 * Everything the exercise sheet shows, for the exercises of one day at once:
 * past sessions with their sets, and personal records. One query, so opening
 * the sheet during a workout costs nothing.
 */
export async function getExerciseStats(
  clientId: string,
  exerciseIds: string[],
): Promise<Record<string, ExerciseStats>> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("set_logs")
    .select(
      "set_no, reps, weight, time_sec, workout:workouts!inner(id, performed_at, client_id, status), program_exercise:program_exercises!inner(exercise_id)",
    )
    .eq("workout.client_id", clientId)
    .eq("workout.status", "done")
    .in("program_exercise.exercise_id", ids);

  const byExercise: Record<string, Map<string, ExerciseSession>> = {};
  for (const row of data ?? []) {
    const exerciseId = row.program_exercise.exercise_id;
    const sessions = (byExercise[exerciseId] ??= new Map());
    const session = sessions.get(row.workout.id) ?? {
      workoutId: row.workout.id,
      date: row.workout.performed_at,
      sets: [],
      best: null,
      volume: 0,
      e1rm: null,
    };
    session.sets.push({
      set_no: row.set_no,
      reps: row.reps,
      weight: row.weight,
      time_sec: row.time_sec,
    });
    if (row.weight != null) {
      if (session.best == null || row.weight > session.best) session.best = row.weight;
      if (row.reps != null && row.reps > 0) {
        session.volume += row.weight * row.reps;
        if (row.reps <= 12) {
          const est = epley(row.weight, row.reps);
          if (session.e1rm == null || est > session.e1rm) session.e1rm = est;
        }
      }
    }
    sessions.set(row.workout.id, session);
  }

  const stats: Record<string, ExerciseStats> = {};
  for (const id of ids) {
    const sessions = [...(byExercise[id]?.values() ?? [])]
      .map((s) => ({ ...s, sets: s.sets.sort((a, b) => a.set_no - b.set_no) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const allSets = sessions.flatMap((s) => s.sets);
    const max = (values: (number | null)[]) => {
      const nums = values.filter((v): v is number => v != null);
      return nums.length > 0 ? Math.max(...nums) : null;
    };

    stats[id] = {
      sessions,
      records: {
        bestWeight: max(allSets.map((s) => s.weight)),
        bestE1rm: max(sessions.map((s) => s.e1rm)),
        bestVolume: max(sessions.map((s) => (s.volume > 0 ? s.volume : null))),
        bestReps: max(allSets.map((s) => s.reps)),
        bestTime: max(allSets.map((s) => s.time_sec)),
        totalSets: allSets.length,
        sessions: sessions.length,
      },
    };
  }
  return stats;
}
