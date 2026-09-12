import { createClient } from "@/lib/supabase/server";
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
  muscles: MuscleGroup[];
};

/** The client's active program with its days, which days are done, and the next day to do. */
export async function getActiveProgram(clientId: string) {
  const supabase = await createClient();
  // Days are fetched through the program so both queries can run at once.
  const [{ data: program }, { data: workouts }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, name, start_date, notes, created_by, review_status, program_days(id, week_no, day_no, title, program_exercises(target_sets, exercise:exercises(muscle_group)))",
      )
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("week_no", { referencedTable: "program_days" })
      .order("day_no", { referencedTable: "program_days" })
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("program_day_id, performed_at, status")
      .eq("client_id", clientId)
      .order("performed_at", { ascending: false }),
  ]);
  if (!program) return null;

  // dayId -> most recent performed_at of a *done* workout
  const doneMap = new Map<string, string>();
  // days that were done or skipped: the "next" pointer moves past them
  const passed = new Set<string>();
  for (const w of workouts ?? []) {
    passed.add(w.program_day_id);
    if (w.status === "done" && !doneMap.has(w.program_day_id)) {
      doneMap.set(w.program_day_id, w.performed_at);
    }
  }

  const days: ProgramDay[] = program.program_days.map((d) => ({
    id: d.id,
    week_no: d.week_no,
    day_no: d.day_no,
    title: d.title,
    exercises: d.program_exercises.length,
    sets: d.program_exercises.reduce((n, pe) => n + (pe.target_sets ?? 0), 0),
    muscles: muscleSummary(d.program_exercises),
  }));

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

/** Cheap counters for the Today screen: only dates are read, no set logs. */
export async function getClientStats(clientId: string): Promise<ClientStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("performed_at")
    .eq("client_id", clientId)
    .eq("status", "done")
    .order("performed_at", { ascending: false });

  const dates = (data ?? []).map((w) => w.performed_at);
  const now = Date.now();
  const day = 86400000;
  const last7 = dates.filter((d) => now - new Date(d).getTime() < 7 * day).length;
  const daysSinceLast =
    dates.length > 0 ? Math.floor((now - new Date(dates[0]).getTime()) / day) : null;

  return { streakWeeks: weekStreak(dates), last7, daysSinceLast, total: dates.length };
}
