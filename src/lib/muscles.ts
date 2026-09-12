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
