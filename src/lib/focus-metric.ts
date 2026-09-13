import type { TranslationKey } from "@/i18n/dictionaries";

/** The numbers a person can watch for one exercise while training. */
export const FOCUS_METRICS = ["volume", "volume_change", "reps", "top_weight"] as const;
export type FocusMetric = (typeof FOCUS_METRICS)[number];

/** Heaviest set: the number most people actually chase, and the easiest to read. */
export const DEFAULT_FOCUS: FocusMetric = "top_weight";

export const FOCUS_LABEL: Record<FocusMetric, TranslationKey> = {
  volume: "focus.volume",
  volume_change: "focus.volumeChange",
  reps: "focus.reps",
  top_weight: "focus.topWeight",
};

export function isFocusMetric(value: unknown): value is FocusMetric {
  return typeof value === "string" && (FOCUS_METRICS as readonly string[]).includes(value);
}

export type SetValues = { weight: number | null; reps: number | null };

export type FocusTotals = {
  volume: number;
  reps: number;
  topWeight: number | null;
  /** Volume against the previous session, in percent. Null when there is nothing to compare with. */
  volumeChange: number | null;
};

/**
 * Today's numbers for one exercise, from the sets ticked so far.
 * `previousVolume` comes from the last session of the same exercise.
 */
export function focusTotals(sets: SetValues[], previousVolume: number | null): FocusTotals {
  let volume = 0;
  let reps = 0;
  let topWeight: number | null = null;
  for (const s of sets) {
    if (s.reps != null) reps += s.reps;
    if (s.weight != null) {
      if (topWeight == null || s.weight > topWeight) topWeight = s.weight;
      if (s.reps != null) volume += s.weight * s.reps;
    }
  }
  const volumeChange =
    previousVolume != null && previousVolume > 0 && volume > 0
      ? Math.round(((volume - previousVolume) / previousVolume) * 100)
      : null;
  return { volume, reps, topWeight, volumeChange };
}
