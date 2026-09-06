import { createClient } from "@/lib/supabase/server";

/** The client's active program with its days, which days are done, and the next day to do. */
export async function getActiveProgram(clientId: string) {
  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, name, start_date, notes")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();
  if (!program) return null;

  const [{ data: days }, { data: workouts }] = await Promise.all([
    supabase
      .from("program_days")
      .select("id, week_no, day_no, title, program_exercises(count)")
      .eq("program_id", program.id)
      .order("week_no")
      .order("day_no"),
    supabase
      .from("workouts")
      .select("program_day_id, performed_at, status")
      .eq("client_id", clientId)
      .order("performed_at", { ascending: false }),
  ]);

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

  const list = days ?? [];
  const nextDay = list.find((d) => !passed.has(d.id)) ?? null;
  return { program, days: list, doneMap, nextDay };
}
