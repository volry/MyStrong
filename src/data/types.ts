/**
 * Firestore documents. Field names keep the snake_case of the old Postgres
 * schema, so the screens read the same shapes they always did. Timestamps are
 * ISO strings: they sort as text and survive JSON.
 */

import type { FocusMetric } from "@/lib/focus-metric";

export type Role = "coach" | "client";
export type Unit = "kg" | "lb";
export type ReviewStatus = "approved" | "self" | "pending" | "changes_requested";
export type WorkoutStatus = "done" | "skipped";

/** users/{uid} */
export type UserDoc = {
  email: string;
  full_name: string | null;
  role: Role;
  /** A client's coach; a coach's own id (their own training is theirs alone). */
  coach_id: string | null;
  unit: Unit;
  locale: "uk" | "en";
  /** Rest countdown after a set, seconds. 0 = off. */
  rest_timer_sec: number;
  /** exercise id -> the number watched for it during a workout */
  focus: Record<string, FocusMetric>;
  created_at: string;
};

/** invites/{email} */
export type InviteDoc = {
  email: string;
  role: Role;
  full_name: string | null;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
};

/** exercises/{id} */
export type ExerciseDoc = {
  name: string;
  youtube_url: string | null;
  description: string | null;
  muscle_group: string | null;
  created_by: string | null;
  created_at: string;
};

/** One exercise inside a program day (was `program_exercises`). */
export type ProgramItem = {
  id: string;
  exercise_id: string;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time_sec: number | null;
  target_rpe: number | null;
  coach_notes: string | null;
};

/** One day inside a program (was `program_days`). Items are in display order. */
export type ProgramDayDoc = {
  id: string;
  week_no: number;
  day_no: number;
  title: string | null;
  /** Plain lines read before the first exercise and after the last; never logged. */
  warmup: string | null;
  cooldown: string | null;
  items: ProgramItem[];
};

/** programs/{id} — days and their exercises live inside the document. */
export type ProgramDoc = {
  client_id: string;
  /** The client's coach, copied here so a coach can ask for exactly their programs. */
  coach_id: string;
  created_by: string | null;
  name: string;
  notes: string | null;
  start_date: string | null;
  is_active: boolean;
  /** Who last switched it on, so a client's own switch does not notify them. */
  activated_by: string | null;
  review_status: ReviewStatus;
  coach_feedback: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  days: ProgramDayDoc[];
};

export type LoggedSetDoc = {
  program_exercise_id: string;
  /** Kept on the set so progress survives edits to the program. */
  exercise_id: string | null;
  set_no: number;
  reps: number | null;
  weight: number | null; // kg
  time_sec: number | null;
  rpe: number | null;
};

/** workouts/{id} — sets and notes live inside the document. */
export type WorkoutDoc = {
  client_id: string;
  /** The client's coach, as on programs. */
  coach_id: string;
  created_by: string;
  program_id: string | null;
  program_day_id: string;
  /** Snapshot of the day, for history after the program changes. */
  day: { week_no: number; day_no: number; title: string | null } | null;
  /** When the session started (or was saved, without "Start the workout"). */
  performed_at: string;
  /** From the "Start the workout" tap to the save; null when the clock was never started. */
  duration_sec: number | null;
  status: WorkoutStatus;
  client_comment: string | null;
  sets: LoggedSetDoc[];
  notes: { program_exercise_id: string; note: string }[];
  /** When a coach first saw it; unread comments badge. */
  coach_seen_at: string | null;
  created_at: string;
};

/** exportTokens/{token} */
export type ExportTokenDoc = { user_id: string; created_at: string };

type WithId<T> = T & { id: string };
export type User = WithId<UserDoc>;
export type Invite = InviteDoc; // the id is the email
export type Exercise = WithId<ExerciseDoc>;
export type Program = WithId<ProgramDoc>;
export type Workout = WithId<WorkoutDoc>;
