// One-time copy of the Supabase data into Firestore, keeping every id.
//
//   node scripts/migrate-from-supabase.mjs <dump.json> [--project mystrong-vvr-2026] [--emulator] [--dry-run]
//
// <dump.json> is the single JSON value returned by DUMP_SQL below (run it in the
// Supabase SQL editor or through the MCP connector and save the result). The
// script is idempotent: documents are written with set(), so a rerun refreshes
// them. Auth accounts are imported separately with `firebase auth:import`, see
// docs/firebase-migration.md; their uids equal the Supabase profile ids.
import { readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const DUMP_SQL = `
select json_build_object(
  'profiles', (select coalesce(json_agg(p), '[]') from public.profiles p),
  'invites', (select coalesce(json_agg(i), '[]') from public.invites i),
  'exercises', (select coalesce(json_agg(e), '[]') from public.exercises e),
  'programs', (select coalesce(json_agg(p), '[]') from public.programs p),
  'program_days', (select coalesce(json_agg(d), '[]') from public.program_days d),
  'program_exercises', (select coalesce(json_agg(x), '[]') from public.program_exercises x),
  'workouts', (select coalesce(json_agg(w), '[]') from public.workouts w),
  'set_logs', (select coalesce(json_agg(s), '[]') from public.set_logs s),
  'notes', (select coalesce(json_agg(n), '[]') from public.workout_exercise_notes n),
  'coach_reads', (select coalesce(json_agg(r), '[]') from public.coach_reads r),
  'exercise_focus', (select coalesce(json_agg(f), '[]') from public.exercise_focus f),
  'export_tokens', (select coalesce(json_agg(t), '[]') from public.export_tokens t)
) as dump`;

const iso = (v) => (v == null ? null : new Date(v).toISOString());
const num = (v) => (v == null ? null : Number(v));
const groupBy = (rows, key) => {
  const map = new Map();
  for (const r of rows) {
    const list = map.get(r[key]) ?? [];
    list.push(r);
    map.set(r[key], list);
  }
  return map;
};

/** Pure transform: Supabase rows -> Firestore documents by path. */
export function transform(dump) {
  const docs = new Map();
  const put = (path, data) => docs.set(path, data);

  const focusByUser = groupBy(dump.exercise_focus, "user_id");
  for (const p of dump.profiles) {
    put(`users/${p.id}`, {
      email: p.email.toLowerCase(),
      full_name: p.full_name,
      role: p.role,
      unit: p.unit,
      locale: p.locale === "uk" ? "uk" : "en",
      rest_timer_sec: p.rest_timer_sec ?? 0,
      focus: Object.fromEntries((focusByUser.get(p.id) ?? []).map((f) => [f.exercise_id, f.metric])),
      created_at: iso(p.created_at),
    });
  }

  for (const i of dump.invites) {
    const email = i.email.toLowerCase();
    put(`invites/${email}`, {
      email,
      role: i.role,
      full_name: i.full_name,
      invited_by: i.invited_by,
      created_at: iso(i.created_at),
      accepted_at: iso(i.accepted_at),
    });
  }

  for (const e of dump.exercises) {
    put(`exercises/${e.id}`, {
      name: e.name,
      youtube_url: e.youtube_url,
      description: e.description,
      muscle_group: e.muscle_group,
      created_by: e.created_by,
      created_at: iso(e.created_at),
    });
  }

  const itemsByDay = groupBy(dump.program_exercises, "program_day_id");
  const daysByProgram = groupBy(dump.program_days, "program_id");
  const dayById = new Map(dump.program_days.map((d) => [d.id, d]));
  const itemById = new Map(dump.program_exercises.map((x) => [x.id, x]));
  for (const p of dump.programs) {
    const days = (daysByProgram.get(p.id) ?? [])
      .sort((a, b) => a.week_no - b.week_no || a.day_no - b.day_no || a.created_at.localeCompare(b.created_at))
      .map((d) => ({
        id: d.id,
        week_no: d.week_no,
        day_no: d.day_no,
        title: d.title,
        items: (itemsByDay.get(d.id) ?? [])
          .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
          .map((x) => ({
            id: x.id,
            exercise_id: x.exercise_id,
            target_sets: x.target_sets,
            target_reps: x.target_reps,
            target_weight: num(x.target_weight),
            target_time_sec: x.target_time_sec,
            target_rpe: num(x.target_rpe),
            coach_notes: x.coach_notes,
          })),
      }));
    put(`programs/${p.id}`, {
      client_id: p.client_id,
      created_by: p.created_by,
      name: p.name,
      notes: p.notes,
      start_date: p.start_date,
      is_active: p.is_active,
      activated_by: null,
      review_status: p.review_status,
      coach_feedback: p.coach_feedback,
      submitted_at: iso(p.submitted_at),
      reviewed_at: iso(p.reviewed_at),
      reviewed_by: p.reviewed_by,
      created_at: iso(p.created_at),
      days,
    });
  }

  const setsByWorkout = groupBy(dump.set_logs, "workout_id");
  const notesByWorkout = groupBy(dump.notes, "workout_id");
  const seen = new Map(dump.coach_reads.map((r) => [r.workout_id, iso(r.seen_at)]));
  for (const w of dump.workouts) {
    const day = dayById.get(w.program_day_id);
    put(`workouts/${w.id}`, {
      client_id: w.client_id,
      // Supabase did not record who logged it; the client is the safe owner.
      created_by: w.client_id,
      program_id: day?.program_id ?? null,
      program_day_id: w.program_day_id,
      day: day ? { week_no: day.week_no, day_no: day.day_no, title: day.title } : null,
      performed_at: iso(w.performed_at),
      status: w.status,
      client_comment: w.client_comment,
      sets: (setsByWorkout.get(w.id) ?? [])
        .sort((a, b) => a.set_no - b.set_no)
        .map((s) => ({
          program_exercise_id: s.program_exercise_id,
          exercise_id: itemById.get(s.program_exercise_id)?.exercise_id ?? null,
          set_no: s.set_no,
          reps: s.reps,
          weight: num(s.weight),
          time_sec: s.time_sec,
          rpe: num(s.rpe),
        })),
      notes: (notesByWorkout.get(w.id) ?? []).map((n) => ({ program_exercise_id: n.program_exercise_id, note: n.note })),
      // Workouts without a comment have nothing to read; mark them seen.
      coach_seen_at: seen.get(w.id) ?? (w.client_comment ? null : iso(w.created_at)),
      created_at: iso(w.created_at),
    });
  }

  for (const t of dump.export_tokens) {
    put(`exportTokens/${t.token}`, { user_id: t.user_id, created_at: iso(t.created_at) });
  }
  return docs;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("usage: migrate-from-supabase.mjs <dump.json> [--project id] [--emulator] [--dry-run]");
  const flag = (name) => args.includes(name);
  const projectArg = args[args.indexOf("--project") + 1];
  const projectId = flag("--project") ? projectArg : flag("--emulator") ? "demo-mystrong" : "mystrong-vvr-2026";
  if (flag("--emulator")) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

  let dump = JSON.parse(readFileSync(file, "utf8"));
  if (Array.isArray(dump)) dump = dump[0];
  if (dump.dump) dump = typeof dump.dump === "string" ? JSON.parse(dump.dump) : dump.dump;
  const docs = transform(dump);

  const counts = {};
  for (const path of docs.keys()) counts[path.split("/")[0]] = (counts[path.split("/")[0]] ?? 0) + 1;
  console.log(`project ${projectId}${flag("--emulator") ? " (emulator)" : ""}:`, counts);
  if (flag("--dry-run")) {
    writeFileSync(file.replace(/\.json$/, ".firestore.json"), JSON.stringify(Object.fromEntries(docs), null, 2));
    return;
  }

  initializeApp({ projectId });
  const db = getFirestore("default");
  const entries = [...docs.entries()];
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db.batch();
    for (const [path, data] of entries.slice(i, i + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
  console.log(`wrote ${entries.length} documents`);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("migrate-from-supabase.mjs")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
