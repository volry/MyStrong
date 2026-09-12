import { formatWeight, type Unit } from "@/lib/units";

/** Shared between the workout form (client) and the pages that prepare its data (server). */

export type PrevSet = {
  set_no: number;
  reps: number | null;
  weight: number | null;
  time_sec: number | null;
};

export type WorkoutItem = {
  id: string;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time_sec: number | null;
  target_rpe: number | null;
  coach_notes: string | null;
  exercise: {
    id: string;
    name: string;
    youtube_url: string | null;
    description: string | null;
    muscle_group: string | null;
  } | null;
};

export type Row = { weight: string; reps: string; time: string; done: boolean };

/** Rows for editing: the saved sets, already ticked. */
export function rowsFromSets(
  items: WorkoutItem[],
  saved: Record<string, PrevSet[]>,
  unit: Unit,
): Record<string, Row[]> {
  const rows: Record<string, Row[]> = {};
  for (const item of items) {
    const sets = (saved[item.id] ?? []).slice().sort((a, b) => a.set_no - b.set_no);
    rows[item.id] =
      sets.length > 0
        ? sets.map((s) => ({
            weight: s.weight != null ? formatWeight(s.weight, unit) : "",
            reps: s.reps != null ? String(s.reps) : "",
            time: s.time_sec != null ? String(s.time_sec) : "",
            done: true,
          }))
        : [{ weight: "", reps: "", time: "", done: false }];
  }
  return rows;
}
