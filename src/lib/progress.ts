import { createClient } from "@/lib/supabase/server";
import { weekStreak } from "@/lib/week";

export type ProgressPoint = {
  workoutId: string;
  date: string; // ISO timestamp
  best: number | null; // heaviest set, kg
  e1rm: number | null; // estimated 1RM, kg
  volume: number; // Σ weight × reps, kg
  sets: number;
};

export type ExerciseProgress = {
  exerciseId: string;
  name: string;
  points: ProgressPoint[]; // oldest first
  bestEver: number | null;
  e1rmBest: number | null;
};

export type ProgressSummary = {
  exercises: ExerciseProgress[];
  totalWorkouts: number;
  workoutsThisMonth: number;
  streakWeeks: number;
};

/** Epley estimate; only meaningful for 1–12 reps. */
function epley(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export async function getProgress(clientId: string): Promise<ProgressSummary> {
  const supabase = await createClient();
  const [{ data: workouts }, { data: sets }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, performed_at")
      .eq("client_id", clientId)
      .eq("status", "done")
      .order("performed_at"),
    supabase
      .from("set_logs")
      .select(
        "reps, weight, workout:workouts!inner(id, performed_at, client_id, status), program_exercise:program_exercises!inner(exercise_id, exercise:exercises(name))",
      )
      .eq("workout.client_id", clientId)
      .eq("workout.status", "done"),
  ]);

  // exercise -> workout -> aggregate
  const byExercise = new Map<string, { name: string; byWorkout: Map<string, ProgressPoint> }>();
  for (const s of sets ?? []) {
    const exId = s.program_exercise.exercise_id;
    const name = s.program_exercise.exercise?.name ?? "?";
    const entry = byExercise.get(exId) ?? { name, byWorkout: new Map() };
    const point = entry.byWorkout.get(s.workout.id) ?? {
      workoutId: s.workout.id,
      date: s.workout.performed_at,
      best: null,
      e1rm: null,
      volume: 0,
      sets: 0,
    };
    point.sets += 1;
    if (s.weight != null) {
      if (point.best == null || s.weight > point.best) point.best = s.weight;
      if (s.reps != null && s.reps > 0) {
        point.volume += s.weight * s.reps;
        if (s.reps <= 12) {
          const est = epley(s.weight, s.reps);
          if (point.e1rm == null || est > point.e1rm) point.e1rm = est;
        }
      }
    }
    entry.byWorkout.set(s.workout.id, point);
    byExercise.set(exId, entry);
  }

  const exercises: ExerciseProgress[] = [...byExercise.entries()]
    .map(([exerciseId, e]) => {
      const points = [...e.byWorkout.values()].sort((a, b) => a.date.localeCompare(b.date));
      const bestEver = points.reduce<number | null>(
        (m, p) => (p.best != null && (m == null || p.best > m) ? p.best : m),
        null,
      );
      const e1rmBest = points.reduce<number | null>(
        (m, p) => (p.e1rm != null && (m == null || p.e1rm > m) ? p.e1rm : m),
        null,
      );
      return { exerciseId, name: e.name, points, bestEver, e1rmBest };
    })
    .sort((a, b) => b.points.length - a.points.length || a.name.localeCompare(b.name));

  const list = workouts ?? [];
  const now = new Date();
  const workoutsThisMonth = list.filter((w) => {
    const d = new Date(w.performed_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const streakWeeks = weekStreak(list.map((w) => w.performed_at), now);

  return { exercises, totalWorkouts: list.length, workoutsThisMonth, streakWeeks };
}
