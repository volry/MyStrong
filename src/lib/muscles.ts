import { MUSCLE_GROUPS, type MuscleGroup, type T } from "@/i18n/dictionaries";

export function isMuscleGroup(g: string | null | undefined): g is MuscleGroup {
  return typeof g === "string" && (MUSCLE_GROUPS as readonly string[]).includes(g);
}

export function muscleLabel(t: T, g: string | null | undefined): string | null {
  return isMuscleGroup(g) ? t(`muscle.${g}`) : null;
}

/** The muscle groups a day works, the ones with most exercises first. */
export function muscleSummary(rows: { exercise: { muscle_group: string | null } | null }[]): MuscleGroup[] {
  const counts = new Map<MuscleGroup, number>();
  for (const r of rows) {
    const g = r.exercise?.muscle_group;
    if (!isMuscleGroup(g)) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || MUSCLE_GROUPS.indexOf(a[0]) - MUSCLE_GROUPS.indexOf(b[0]))
    .map(([g]) => g);
}

/**
 * A tint per muscle group, so a day's badges read at a glance. Hues are spread so
 * that groups which usually share a day (chest / shoulders / arms / core, or
 * legs / glutes / core) never land on neighbouring colours; teal is left alone
 * because it is the app's own accent. Warm-ups and "other" stay neutral — they
 * are not a muscle group. Class strings are literal so Tailwind keeps them.
 */
export const MUSCLE_BADGE: Record<MuscleGroup, string> = {
  chest: "bg-rose-100 text-rose-800",
  back: "bg-blue-100 text-blue-800",
  shoulders: "bg-amber-100 text-amber-900",
  arms: "bg-violet-100 text-violet-800",
  legs: "bg-green-100 text-green-800",
  glutes: "bg-fuchsia-100 text-fuchsia-800",
  core: "bg-sky-100 text-sky-800",
  cardio: "bg-orange-100 text-orange-800",
  fullbody: "bg-stone-200 text-stone-700",
  other: "bg-stone-200 text-stone-700",
};
