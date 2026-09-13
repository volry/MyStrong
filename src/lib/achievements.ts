import { createClient } from "@/lib/supabase/server";
import { isoWeekKey } from "@/lib/week";
import { isMuscleGroup } from "@/lib/muscles";
import type { TranslationKey } from "@/i18n/dictionaries";

export type AchievementCategory = "consistency" | "records" | "volume" | "program";

/**
 * What a badge counts. Weight metrics are kg; the screen converts them.
 * Every metric only ever grows, so a badge once earned stays earned.
 */
export type AchievementMetric =
  | "workouts"
  | "streak"
  | "prs"
  | "topSet"
  | "tonnage"
  | "dayVolume"
  | "exercises"
  | "weekGroups"
  | "programWeeks"
  | "programsDone";

export type Achievement = {
  id: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  /** Name of the badge; weight and volume ones take the target as a variable. */
  name: TranslationKey;
  target: number;
  /** Where the person stands on that metric right now. */
  value: number;
  /** The date of the workout that earned it, or null while it is locked. */
  unlockedAt: string | null;
  /** The workout that earned it — how the finish screen knows what is new. */
  unlockedBy: string | null;
};

type Def = Omit<Achievement, "value" | "unlockedAt" | "unlockedBy">;

/** Thresholds are written so the Ukrainian names below stay grammatical. */
const DEFS: Def[] = [
  { id: "first", category: "consistency", metric: "workouts", target: 1, name: "ach.first" },
  { id: "w10", category: "consistency", metric: "workouts", target: 10, name: "ach.w10" },
  { id: "w25", category: "consistency", metric: "workouts", target: 25, name: "ach.w25" },
  { id: "w50", category: "consistency", metric: "workouts", target: 50, name: "ach.w50" },
  { id: "w100", category: "consistency", metric: "workouts", target: 100, name: "ach.w100" },
  { id: "s2", category: "consistency", metric: "streak", target: 2, name: "ach.s2" },
  { id: "s4", category: "consistency", metric: "streak", target: 4, name: "ach.s4" },
  { id: "s8", category: "consistency", metric: "streak", target: 8, name: "ach.s8" },
  { id: "s12", category: "consistency", metric: "streak", target: 12, name: "ach.s12" },
  { id: "s26", category: "consistency", metric: "streak", target: 26, name: "ach.s26" },

  { id: "pr1", category: "records", metric: "prs", target: 1, name: "ach.pr1" },
  { id: "pr10", category: "records", metric: "prs", target: 10, name: "ach.pr10" },
  { id: "pr25", category: "records", metric: "prs", target: 25, name: "ach.pr25" },
  { id: "lift60", category: "records", metric: "topSet", target: 60, name: "ach.lift" },
  { id: "lift80", category: "records", metric: "topSet", target: 80, name: "ach.lift" },
  { id: "lift100", category: "records", metric: "topSet", target: 100, name: "ach.lift" },

  { id: "t10", category: "volume", metric: "tonnage", target: 10_000, name: "ach.tonnage" },
  { id: "t50", category: "volume", metric: "tonnage", target: 50_000, name: "ach.tonnage" },
  { id: "t100", category: "volume", metric: "tonnage", target: 100_000, name: "ach.tonnage" },
  { id: "day5", category: "volume", metric: "dayVolume", target: 5_000, name: "ach.day" },
  { id: "day10", category: "volume", metric: "dayVolume", target: 10_000, name: "ach.day" },

  { id: "ex10", category: "program", metric: "exercises", target: 10, name: "ach.ex10" },
  { id: "ex25", category: "program", metric: "exercises", target: 25, name: "ach.ex25" },
  { id: "ex50", category: "program", metric: "exercises", target: 50, name: "ach.ex50" },
  { id: "groups4", category: "program", metric: "weekGroups", target: 4, name: "ach.groups4" },
  { id: "groups6", category: "program", metric: "weekGroups", target: 6, name: "ach.groups6" },
  { id: "weeks4", category: "program", metric: "programWeeks", target: 4, name: "ach.weeks4" },
  { id: "programDone", category: "program", metric: "programsDone", target: 1, name: "ach.programDone" },
];

export const ACHIEVEMENT_HINT: Record<AchievementMetric, TranslationKey> = {
  workouts: "ach.hint.workouts",
  streak: "ach.hint.streak",
  prs: "ach.hint.prs",
  topSet: "ach.hint.topSet",
  tonnage: "ach.hint.tonnage",
  dayVolume: "ach.hint.dayVolume",
  exercises: "ach.hint.exercises",
  weekGroups: "ach.hint.weekGroups",
  programWeeks: "ach.hint.programWeeks",
  programsDone: "ach.hint.programsDone",
};

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  "consistency",
  "records",
  "volume",
  "program",
];

/** Metrics measured in kg, so the screen knows to convert and to say "t" or "kg". */
export function isWeightMetric(m: AchievementMetric): boolean {
  return m === "topSet" || m === "tonnage" || m === "dayVolume";
}

type WorkoutFacts = {
  id: string;
  date: string;
  volume: number;
  /** Heaviest set per exercise that day, kg. */
  bestByExercise: Map<string, number>;
  groups: Set<string>;
  dayId: string;
};

export type LoggedWorkout = { id: string; performed_at: string; program_day_id: string };
export type LoggedSet = {
  reps: number | null;
  weight: number | null;
  workout: { id: string };
  program_exercise: { exercise_id: string; exercise: { muscle_group: string | null } | null };
};
export type ProgramShape = { id: string; program_days: { id: string; week_no: number }[] };

/**
 * Every badge, earned or not, replayed from the training log.
 *
 * Nothing is stored: the log is the only source of truth, so a corrected or
 * deleted workout corrects the badges too. Walking the workouts in order also
 * gives each badge the date it was actually earned, and the workout that did it.
 * Workouts must arrive oldest first.
 */
export function replayAchievements(
  workouts: LoggedWorkout[],
  sets: LoggedSet[],
  programs: ProgramShape[],
): Achievement[] {
  // Sets, gathered per workout.
  const facts = new Map<string, WorkoutFacts>();
  const factsOf = (w: { id: string; performed_at: string; program_day_id: string }) => {
    const f = facts.get(w.id) ?? {
      id: w.id,
      date: w.performed_at,
      volume: 0,
      bestByExercise: new Map<string, number>(),
      groups: new Set<string>(),
      dayId: w.program_day_id,
    };
    facts.set(w.id, f);
    return f;
  };
  for (const w of workouts) factsOf(w);
  for (const s of sets) {
    const f = facts.get(s.workout.id);
    if (!f) continue;
    if (s.weight != null && s.reps != null) f.volume += s.weight * s.reps;
    const exId = s.program_exercise.exercise_id;
    if (s.weight != null) {
      f.bestByExercise.set(exId, Math.max(f.bestByExercise.get(exId) ?? 0, s.weight));
    } else if (!f.bestByExercise.has(exId)) {
      f.bestByExercise.set(exId, 0); // bodyweight or timed work still counts as trained
    }
    const g = s.program_exercise.exercise?.muscle_group;
    if (isMuscleGroup(g)) f.groups.add(g);
  }

  // Which program a day belongs to, and which week of it.
  const dayInfo = new Map<string, { programId: string; week: number }>();
  const programDays = new Map<string, { id: string; week_no: number }[]>();
  for (const p of programs) {
    programDays.set(p.id, p.program_days ?? []);
    for (const d of p.program_days ?? []) dayInfo.set(d.id, { programId: p.id, week: d.week_no });
  }

  const counters: Record<AchievementMetric, number> = {
    workouts: 0,
    streak: 0,
    prs: 0,
    topSet: 0,
    tonnage: 0,
    dayVolume: 0,
    exercises: 0,
    weekGroups: 0,
    programWeeks: 0,
    programsDone: 0,
  };
  const bestEver = new Map<string, number>();
  const weekGroups = new Map<string, Set<string>>();
  const doneDays = new Map<string, Set<string>>();
  const countedWeeks = new Set<string>();
  const countedPrograms = new Set<string>();
  const unlocked = new Map<string, { at: string; by: string }>();
  let lastWeek: string | null = null;
  let streak = 0;

  for (const w of workouts) {
    const f = facts.get(w.id);
    if (!f) continue;
    const when = new Date(f.date);

    counters.workouts += 1;

    // Weeks in a row, as they happened.
    const week = isoWeekKey(when);
    if (week !== lastWeek) {
      const previous = new Date(when);
      previous.setDate(previous.getDate() - 7);
      streak = lastWeek != null && isoWeekKey(previous) === lastWeek ? streak + 1 : 1;
      lastWeek = week;
    }
    counters.streak = Math.max(counters.streak, streak);

    counters.tonnage += f.volume;
    counters.dayVolume = Math.max(counters.dayVolume, f.volume);

    for (const [exId, best] of f.bestByExercise) {
      const previous = bestEver.get(exId);
      // A first session is not a record; beating your own weight is.
      if (previous != null && best > previous) counters.prs += 1;
      if (previous == null || best > previous) bestEver.set(exId, best);
      counters.topSet = Math.max(counters.topSet, best);
    }
    counters.exercises = bestEver.size;

    const inWeek = weekGroups.get(week) ?? new Set<string>();
    for (const g of f.groups) inWeek.add(g);
    weekGroups.set(week, inWeek);
    counters.weekGroups = Math.max(counters.weekGroups, inWeek.size);

    // Program weeks and whole programs, counted the moment the last day lands.
    const info = dayInfo.get(f.dayId);
    if (info) {
      const done = doneDays.get(info.programId) ?? new Set<string>();
      done.add(f.dayId);
      doneDays.set(info.programId, done);
      const all = programDays.get(info.programId) ?? [];
      const weekKey = `${info.programId}:${info.week}`;
      const weekDays = all.filter((d) => d.week_no === info.week);
      if (
        !countedWeeks.has(weekKey) &&
        weekDays.length > 0 &&
        weekDays.every((d) => done.has(d.id))
      ) {
        countedWeeks.add(weekKey);
        counters.programWeeks += 1;
      }
      if (
        !countedPrograms.has(info.programId) &&
        all.length > 0 &&
        all.every((d) => done.has(d.id))
      ) {
        countedPrograms.add(info.programId);
        counters.programsDone += 1;
      }
    }

    for (const def of DEFS) {
      if (unlocked.has(def.id)) continue;
      if (counters[def.metric] >= def.target) unlocked.set(def.id, { at: f.date, by: f.id });
    }
  }

  return DEFS.map((def) => {
    const hit = unlocked.get(def.id);
    return {
      ...def,
      value: counters[def.metric],
      unlockedAt: hit?.at ?? null,
      unlockedBy: hit?.by ?? null,
    };
  });
}

/** The same, for one client, read straight from the database. */
export async function getAchievements(clientId: string): Promise<Achievement[]> {
  const supabase = await createClient();
  const [{ data: workouts }, { data: sets }, { data: programs }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, performed_at, program_day_id")
      .eq("client_id", clientId)
      .eq("status", "done")
      .order("performed_at"),
    supabase
      .from("set_logs")
      .select(
        "reps, weight, workout:workouts!inner(id, client_id, status), program_exercise:program_exercises!inner(exercise_id, exercise:exercises(muscle_group))",
      )
      .eq("workout.client_id", clientId)
      .eq("workout.status", "done"),
    supabase.from("programs").select("id, program_days(id, week_no)").eq("client_id", clientId),
  ]);
  return replayAchievements(
    workouts ?? [],
    sets ?? [],
    (programs ?? []).map((p) => ({ id: p.id, program_days: p.program_days ?? [] })),
  );
}

/** Earned first, newest earned at the front; then the closest one still locked. */
export function sortForDisplay(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => {
    if (a.unlockedAt && b.unlockedAt) return b.unlockedAt.localeCompare(a.unlockedAt);
    if (a.unlockedAt) return -1;
    if (b.unlockedAt) return 1;
    return b.value / b.target - a.value / a.target;
  });
}

/** How far along a locked badge is, 0–100. */
export function achievementPercent(a: Achievement): number {
  return Math.min(100, Math.round((a.value / a.target) * 100));
}
