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
