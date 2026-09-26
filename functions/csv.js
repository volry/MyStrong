// One row per logged set, the columns the Supabase export had.
const HEADER = [
  "date", "client", "email", "program", "week", "day", "day_title", "exercise", "set",
  "weight_kg", "reps", "seconds", "rpe", "exercise_note", "comment", "workout_id",
];

function cell(value) {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** workouts/programs: arrays of {id, ...doc}; exercises/users: Map id -> doc. */
export function buildCsv({ workouts, programs, exercises, users }) {
  const programById = new Map(programs.map((p) => [p.id, p]));
  const rows = [];
  for (const w of [...workouts].sort((a, b) => a.performed_at.localeCompare(b.performed_at))) {
    if (w.status !== "done") continue;
    const program = w.program_id ? programById.get(w.program_id) : undefined;
    const day = program?.days?.find((d) => d.id === w.program_day_id);
    const order = new Map((day?.items ?? []).map((item, i) => [item.id, i]));
    const client = users.get(w.client_id) ?? {};
    const notes = new Map((w.notes ?? []).map((n) => [n.program_exercise_id, n.note]));
    const sets = [...w.sets].sort(
      (a, b) =>
        (order.get(a.program_exercise_id) ?? 999) - (order.get(b.program_exercise_id) ?? 999) || a.set_no - b.set_no,
    );
    for (const s of sets) {
      rows.push([
        w.performed_at,
        client.full_name ?? "",
        client.email ?? "",
        program?.name ?? "",
        w.day?.week_no ?? day?.week_no ?? "",
        w.day?.day_no ?? day?.day_no ?? "",
        w.day?.title ?? day?.title ?? "",
        (s.exercise_id && exercises.get(s.exercise_id)?.name) || "",
        s.set_no,
        s.weight ?? "",
        s.reps ?? "",
        s.time_sec ?? "",
        s.rpe ?? "",
        notes.get(s.program_exercise_id) ?? "",
        w.client_comment ?? "",
        w.id,
      ].map(cell).join(","));
    }
  }
  // BOM so Excel and Sheets read Cyrillic correctly.
  return "﻿" + [HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}
