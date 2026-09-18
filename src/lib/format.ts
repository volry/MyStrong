import type { T } from "@/i18n/dictionaries";

export type Targets = {
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time_sec: number | null;
  target_rpe: number | null;
};

/** "4 × 8 @ 60 kg · RPE 8" style summary of planned targets. Weight is kg. */
export function formatTarget(x: Targets): string {
  const parts: string[] = [];
  const work =
    x.target_reps != null ? String(x.target_reps) : x.target_time_sec != null ? `${x.target_time_sec}s` : null;
  if (x.target_sets != null && work) parts.push(`${x.target_sets} × ${work}`);
  else if (x.target_sets != null) parts.push(`${x.target_sets} ×`);
  else if (work) parts.push(work);
  if (x.target_weight != null) parts.push(`@ ${formatKg(x.target_weight)} kg`);
  if (x.target_rpe != null) parts.push(`RPE ${x.target_rpe}`);
  return parts.join(" ");
}

export function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Elapsed time: "8:42", and "1:05:30" once a workout runs past the hour. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** How long a session took, for history: "52 хв", "1 год 05 хв". */
export function formatDuration(seconds: number | null | undefined, t: T): string | null {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("workout.hoursMinutes", { h, m: String(m).padStart(2, "0") }) : t("workout.minutes", { n: m });
}
