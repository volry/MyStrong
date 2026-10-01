import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { go } from "@/lib/nav";
import { findDay } from "@/lib/client-data";
import { isFocusMetric } from "@/lib/focus-metric";
import type { TranslationKey } from "@/i18n/dictionaries";
import type { Profile } from "@/lib/profile";
import type { LoggedSetDoc, Program, Workout, WorkoutDoc } from "../types";
import { fire, newId, now } from "../write";
import { track } from "@/lib/analytics";

export type SetInput = {
  program_exercise_id: string;
  set_no: number;
  reps: number | null;
  weight: number | null; // kg
  time_sec: number | null;
};

export type NoteInput = { program_exercise_id: string; note: string };

export type FinishInput = {
  dayId: string;
  comment: string;
  sets: SetInput[];
  notes?: NoteInput[];
  /** Coach logging on behalf of a client. */
  clientId?: string;
  /** When "Start the workout" was tapped, ISO. */
  startedAt?: string;
};

/**
 * A workout belongs to the moment it started, not the moment it was saved — but
 * only when that moment is believable. A session left open overnight, or a clock
 * ahead of the phone's, falls back to now.
 */
function sessionFrom(startedAt: string | undefined): { performed_at?: string; duration_sec: number | null } {
  if (!startedAt) return { duration_sec: null };
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return { duration_sec: null };
  const ago = Date.now() - started;
  if (ago < 0 || ago > 12 * 60 * 60 * 1000) return { duration_sec: null };
  return {
    performed_at: new Date(started).toISOString(),
    // A session shorter than a minute is a mis-tap, not a workout worth timing.
    duration_sec: ago >= 60_000 ? Math.round(ago / 1000) : null,
  };
}

function cleanInt(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), max);
}
function cleanNum(v: unknown, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v * 100) / 100, max);
}

/** Sets with the library exercise attached, so progress survives later program edits. */
function cleanSets(sets: SetInput[] | undefined, exerciseOf: (peId: string) => string | null): LoggedSetDoc[] {
  return (sets ?? [])
    .map((s) => ({
      program_exercise_id: String(s.program_exercise_id),
      exercise_id: exerciseOf(String(s.program_exercise_id)),
      set_no: cleanInt(s.set_no, 100) ?? 1,
      reps: cleanInt(s.reps, 1000),
      weight: cleanNum(s.weight, 2000),
      time_sec: cleanInt(s.time_sec, 86400),
      rpe: null,
    }))
    .filter((s) => s.reps != null || s.weight != null || s.time_sec != null);
}

function cleanNotes(notes: NoteInput[] | undefined) {
  return (notes ?? [])
    .map((n) => ({ program_exercise_id: String(n.program_exercise_id), note: String(n.note ?? "").trim().slice(0, 500) }))
    .filter((n) => n.note.length > 0);
}

function cleanComment(comment: string | undefined): string | null {
  const c = comment?.trim() ?? "";
  return c ? c.slice(0, 2000) : null;
}

/** The coach a person's records are filed under: the coach's own id when a coach writes. */
function coachIdFor(profile: Profile): string {
  return profile.role === "coach" ? profile.id : (profile.coach_id ?? "");
}

/** Who the workout belongs to: the actor, or a client when the coach logs for them. */
function resolveOwner(profile: Profile, clientId: string | undefined): string {
  return clientId && profile.role === "coach" && clientId !== profile.id ? clientId : profile.id;
}

function exerciseLookup(programs: Program[], dayId: string) {
  const found = findDay(programs, dayId);
  const byItem = new Map(found?.day.items.map((i) => [i.id, i.exercise_id]) ?? []);
  return { found, exerciseOf: (peId: string) => byItem.get(peId) ?? null };
}

/**
 * Saves a finished workout on the device (and to the server when online).
 * Returns the saved workout so the screen can check what it unlocked.
 */
export function finishWorkout(
  profile: Profile,
  programs: Program[],
  input: FinishInput,
): { error: TranslationKey } | { workout: Workout } {
  const ownerId = resolveOwner(profile, input.clientId);
  const { found, exerciseOf } = exerciseLookup(programs, input.dayId);
  const sets = cleanSets(input.sets, exerciseOf);
  if (sets.length === 0) return { error: "workout.noSets" };

  const id = newId("workouts");
  const stamp = now();
  const session = sessionFrom(input.startedAt);
  const workout: WorkoutDoc = {
    client_id: ownerId,
    coach_id: coachIdFor(profile),
    created_by: profile.id,
    program_id: found?.program.id ?? null,
    program_day_id: input.dayId,
    day: found ? { week_no: found.day.week_no, day_no: found.day.day_no, title: found.day.title } : null,
    performed_at: session.performed_at ?? stamp,
    duration_sec: session.duration_sec,
    status: "done",
    client_comment: cleanComment(input.comment),
    sets,
    notes: cleanNotes(input.notes),
    coach_seen_at: null,
    created_at: stamp,
  };
  fire(setDoc(doc(db, "workouts", id), workout));
  track("workout_finish", { sets: sets.length, for_client: ownerId !== profile.id ? 1 : 0 });
  return { workout: { ...workout, id } };
}

export type UpdateInput = {
  workoutId: string;
  comment: string;
  performedAt: string;
  sets: SetInput[];
  notes?: NoteInput[];
};

/** Replace a logged workout's sets, comment, and date. */
export function updateWorkout(
  workout: Workout,
  programs: Program[],
  input: UpdateInput,
): { error: TranslationKey } | void {
  const { exerciseOf } = exerciseLookup(programs, workout.program_day_id);
  // Sets of a day that has since been deleted keep the exercise they had.
  const known = new Map(workout.sets.map((s) => [s.program_exercise_id, s.exercise_id]));
  const sets = cleanSets(input.sets, (peId) => exerciseOf(peId) ?? known.get(peId) ?? null);
  if (sets.length === 0) return { error: "workout.noSets" };

  const performedAt = new Date(input.performedAt);
  if (Number.isNaN(performedAt.getTime())) return { error: "common.error" };

  fire(
    updateDoc(doc(db, "workouts", workout.id), {
      client_comment: cleanComment(input.comment),
      performed_at: performedAt.toISOString(),
      status: "done",
      sets,
      notes: cleanNotes(input.notes),
    }),
  );
  go(`/history/${workout.id}?saved=1`, { replace: true });
}

export function skipDay(profile: Profile, programs: Program[], dayId: string, clientId?: string) {
  const ownerId = resolveOwner(profile, clientId);
  const forClient = ownerId !== profile.id;
  const { found } = exerciseLookup(programs, dayId);
  const stamp = now();
  const workout: WorkoutDoc = {
    client_id: ownerId,
    coach_id: coachIdFor(profile),
    created_by: profile.id,
    program_id: found?.program.id ?? null,
    program_day_id: dayId,
    day: found ? { week_no: found.day.week_no, day_no: found.day.day_no, title: found.day.title } : null,
    performed_at: stamp,
    duration_sec: null,
    status: "skipped",
    client_comment: null,
    sets: [],
    notes: [],
    coach_seen_at: null,
    created_at: stamp,
  };
  fire(setDoc(doc(db, "workouts", newId("workouts")), workout));
  track("workout_skip");
  go(forClient ? `/clients/${ownerId}?skipped=1` : profile.role === "coach" ? "/me?skipped=1" : "/?skipped=1");
}

export function deleteWorkout(profile: Profile, workout: Workout) {
  fire(deleteDoc(doc(db, "workouts", workout.id)));
  const forClient = workout.client_id !== profile.id;
  go(forClient ? `/clients/${workout.client_id}` : "/history", { replace: true });
}

/** Coach opened the client's page: their comments are no longer new. */
export function markWorkoutsSeen(workouts: Workout[]) {
  const stamp = now();
  for (const w of workouts) {
    if (w.coach_seen_at == null) fire(updateDoc(doc(db, "workouts", w.id), { coach_seen_at: stamp }));
  }
}

/**
 * Remember which number the person watches for an exercise. Stored on the
 * owner's profile; when the coach logs for a client, the choice is the client's.
 */
export function setFocusMetric(profile: Profile, exerciseId: string, metric: string, clientId?: string) {
  if (!isFocusMetric(metric)) return;
  const ownerId = resolveOwner(profile, clientId);
  fire(updateDoc(doc(db, "users", ownerId), { [`focus.${exerciseId}`]: metric }));
}

/**
 * Add an exercise to the day being trained, from the workout screen. It lands in
 * the program day itself, not just in today's session, so it is there next time
 * too. A client may change only a program they wrote, and not while it is with
 * the coach for review; a coach may add to any program of theirs.
 */
export function addExerciseToDay(
  profile: Profile,
  programs: Program[],
  input: { dayId: string; exerciseId: string },
): { error: TranslationKey } | void {
  const found = findDay(programs, input.dayId);
  if (!found || !input.exerciseId) return { error: "common.error" };
  const { program, day } = found;
  const mine = program.client_id === profile.id && program.created_by === profile.id;
  if (!mine && profile.role !== "coach") return { error: "workout.addNotYours" };
  if (program.review_status === "pending") return { error: "workout.addWhilePending" };
  if (day.items.some((i) => i.exercise_id === input.exerciseId)) return { error: "workout.alreadyInDay" };

  const item = {
    id: crypto.randomUUID(),
    exercise_id: input.exerciseId,
    target_sets: null,
    target_reps: null,
    target_weight: null,
    target_time_sec: null,
    target_rpe: null,
    coach_notes: null,
  };
  const days = program.days.map((d) => (d.id === day.id ? { ...d, items: [...d.items, item] } : d));
  fire(
    updateDoc(doc(db, "programs", program.id), {
      days,
      // An approved program that changes is no longer what the coach approved.
      ...(mine && program.review_status === "approved" ? { review_status: "self" } : {}),
    }),
  );
}
