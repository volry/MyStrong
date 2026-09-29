import type { Exercise, Program, Workout } from "@/data/types";
import { isoWeekKey } from "@/lib/week";
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
  | "programWeeks"
  | "programsDone";

/**
 * How heavy a badge is, drawn as the plate of that weight: 5 kg white, then the
 * competition colours 10 green, 15 yellow, 20 blue, 25 red, and chrome on top.
 */
export type AchievementTier = 1 | 2 | 3 | 4 | 5 | 6;

export type Achievement = {
  id: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  tier: AchievementTier;
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

/**
 * Ladders that take months, not a week: a record has to be a real one, a week
 * only counts toward a streak with two workouts in it, and tonnage is counted
 * in hundreds of tonnes. Thresholds keep the Ukrainian names grammatical.
 */
const DEFS: Def[] = [
  { id: "first", category: "consistency", metric: "workouts", tier: 1, target: 1, name: "ach.first" },
  { id: "w25", category: "consistency", metric: "workouts", tier: 2, target: 25, name: "ach.workouts" },
  { id: "w50", category: "consistency", metric: "workouts", tier: 3, target: 50, name: "ach.workouts" },
  { id: "w100", category: "consistency", metric: "workouts", tier: 4, target: 100, name: "ach.workouts" },
  { id: "w200", category: "consistency", metric: "workouts", tier: 5, target: 200, name: "ach.workouts" },
  { id: "w365", category: "consistency", metric: "workouts", tier: 6, target: 365, name: "ach.workouts" },
  { id: "s4", category: "consistency", metric: "streak", tier: 2, target: 4, name: "ach.s4" },
  { id: "s8", category: "consistency", metric: "streak", tier: 3, target: 8, name: "ach.s8" },
  { id: "s12", category: "consistency", metric: "streak", tier: 4, target: 12, name: "ach.s12" },
  { id: "s26", category: "consistency", metric: "streak", tier: 5, target: 26, name: "ach.s26" },
  { id: "s52", category: "consistency", metric: "streak", tier: 6, target: 52, name: "ach.s52" },

  { id: "pr5", category: "records", metric: "prs", tier: 2, target: 5, name: "ach.prs" },
  { id: "pr25", category: "records", metric: "prs", tier: 3, target: 25, name: "ach.prs" },
  { id: "pr50", category: "records", metric: "prs", tier: 4, target: 50, name: "ach.prs" },
  { id: "pr100", category: "records", metric: "prs", tier: 6, target: 100, name: "ach.prs" },
  { id: "lift80", category: "records", metric: "topSet", tier: 2, target: 80, name: "ach.lift" },
  { id: "lift100", category: "records", metric: "topSet", tier: 3, target: 100, name: "ach.lift" },
  { id: "lift120", category: "records", metric: "topSet", tier: 4, target: 120, name: "ach.lift" },
  { id: "lift140", category: "records", metric: "topSet", tier: 5, target: 140, name: "ach.lift" },

  { id: "t100", category: "volume", metric: "tonnage", tier: 2, target: 100_000, name: "ach.tonnage" },
  { id: "t250", category: "volume", metric: "tonnage", tier: 3, target: 250_000, name: "ach.tonnage" },
  { id: "t500", category: "volume", metric: "tonnage", tier: 4, target: 500_000, name: "ach.tonnage" },
  { id: "t1000", category: "volume", metric: "tonnage", tier: 6, target: 1_000_000, name: "ach.tonnage" },
  { id: "day10", category: "volume", metric: "dayVolume", tier: 2, target: 10_000, name: "ach.day" },
  { id: "day15", category: "volume", metric: "dayVolume", tier: 3, target: 15_000, name: "ach.day" },
  { id: "day20", category: "volume", metric: "dayVolume", tier: 4, target: 20_000, name: "ach.day" },

  { id: "weeks4", category: "program", metric: "programWeeks", tier: 2, target: 4, name: "ach.weeks4" },
  { id: "weeks12", category: "program", metric: "programWeeks", tier: 4, target: 12, name: "ach.weeks12" },
  { id: "programDone", category: "program", metric: "programsDone", tier: 3, target: 1, name: "ach.programDone" },
  { id: "programs3", category: "program", metric: "programsDone", tier: 5, target: 3, name: "ach.programs3" },
  { id: "ex25", category: "program", metric: "exercises", tier: 2, target: 25, name: "ach.ex25" },
  { id: "ex50", category: "program", metric: "exercises", tier: 3, target: 50, name: "ach.ex50" },
];

/** A record has to beat your best by this much, kg… */
const PR_MIN_GAIN = 2.5;
/** …in an exercise done at least this many times before. */
const PR_MIN_SESSIONS = 3;
/** A week counts toward a streak once it holds this many workouts. */
const STREAK_WEEK_WORKOUTS = 2;

export const ACHIEVEMENT_HINT: Record<AchievementMetric, TranslationKey> = {
  workouts: "ach.hint.workouts",
  streak: "ach.hint.streak",
  prs: "ach.hint.prs",
  topSet: "ach.hint.topSet",
  tonnage: "ach.hint.tonnage",
  dayVolume: "ach.hint.dayVolume",
  exercises: "ach.hint.exercises",
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
  /** Heaviest set per exercise that day with 1–12 reps, kg (0 for bodyweight or timed work). */
  bestByExercise: Map<string, number>;
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
    // A weight moved zero times, or for twenty reps, is not a strength record.
    if (s.weight != null && s.reps != null && s.reps >= 1 && s.reps <= 12) {
      f.bestByExercise.set(exId, Math.max(f.bestByExercise.get(exId) ?? 0, s.weight));
    } else if (!f.bestByExercise.has(exId)) {
      f.bestByExercise.set(exId, 0); // bodyweight or timed work still counts as trained
    }
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
    programWeeks: 0,
    programsDone: 0,
  };
  const bestEver = new Map<string, number>();
  const sessionsOf = new Map<string, number>();
  const workoutsInWeek = new Map<string, number>();
  const doneDays = new Map<string, Set<string>>();
  const countedWeeks = new Set<string>();
  const countedPrograms = new Set<string>();
  const unlocked = new Map<string, { at: string; by: string }>();
  let lastStreakWeek: string | null = null;
  let streak = 0;

  for (const w of workouts) {
    const f = facts.get(w.id);
    if (!f) continue;
    const when = new Date(f.date);

    counters.workouts += 1;

    // Weeks in a row, as they happened: a week joins the streak when it gets
    // its second workout, and continues it only if the week before did too.
    const week = isoWeekKey(when);
    const inWeek = (workoutsInWeek.get(week) ?? 0) + 1;
    workoutsInWeek.set(week, inWeek);
    if (inWeek === STREAK_WEEK_WORKOUTS) {
      const previous = new Date(when);
      previous.setDate(previous.getDate() - 7);
      streak = lastStreakWeek != null && isoWeekKey(previous) === lastStreakWeek ? streak + 1 : 1;
      lastStreakWeek = week;
    }
    counters.streak = Math.max(counters.streak, streak);

    counters.tonnage += f.volume;
    counters.dayVolume = Math.max(counters.dayVolume, f.volume);

    for (const [exId, best] of f.bestByExercise) {
      const previous = bestEver.get(exId);
      const sessions = sessionsOf.get(exId) ?? 0;
      // A record beats your own best by a real margin in a lift you know,
      // not the second time you try something.
      if (previous != null && sessions >= PR_MIN_SESSIONS && best >= previous + PR_MIN_GAIN) counters.prs += 1;
      if (previous == null || best > previous) bestEver.set(exId, best);
      sessionsOf.set(exId, sessions + 1);
      counters.topSet = Math.max(counters.topSet, best);
    }
    counters.exercises = bestEver.size;

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
export function getAchievements(
  clientId: string,
  workouts: Workout[],
  programs: Program[],
  exercises: Map<string, Exercise>,
): Achievement[] {
  const done = workouts
    .filter((w) => w.client_id === clientId && w.status === "done")
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
  const sets: LoggedSet[] = done.flatMap((w) =>
    w.sets.map((s) => ({
      reps: s.reps,
      weight: s.weight,
      workout: { id: w.id },
      program_exercise: {
        exercise_id: s.exercise_id ?? s.program_exercise_id,
        exercise: { muscle_group: (s.exercise_id && exercises.get(s.exercise_id)?.muscle_group) || null },
      },
    })),
  );
  return replayAchievements(
    done,
    sets,
    programs
      .filter((p) => p.client_id === clientId)
      .map((p) => ({ id: p.id, program_days: p.days.map((d) => ({ id: d.id, week_no: d.week_no })) })),
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
