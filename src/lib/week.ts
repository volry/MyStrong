/** ISO week key ("2026-37") — used for workout streaks. */
export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-${week}`;
}

/** Consecutive ISO weeks with a workout, counting back from this week. */
export function weekStreak(dates: string[], now = new Date()): number {
  const weeks = new Set(dates.map((d) => isoWeekKey(new Date(d))));
  let streak = 0;
  const cursor = new Date(now);
  // This week may still be empty without breaking the streak.
  if (!weeks.has(isoWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(isoWeekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
