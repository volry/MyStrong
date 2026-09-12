import { createClient } from "@/lib/supabase/server";

/** The client's active program with its days, which days are done, and the next day to do. */
export async function getActiveProgram(clientId: string) {
  const supabase = await createClient();
  // Days are fetched through the program so both queries can run at once.
  const [{ data: program }, { data: workouts }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, name, start_date, notes, created_by, review_status, program_days(id, week_no, day_no, title, program_exercises(count))",
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

  const list = program.program_days;
  const nextDay = list.find((d) => !passed.has(d.id)) ?? null;
  return {
    program: {
      id: program.id,
      name: program.name,
      start_date: program.start_date,
      notes: program.notes,
      created_by: program.created_by,
      review_status: program.review_status,
    },
    days: list,
    doneMap,
    nextDay,
  };
}
