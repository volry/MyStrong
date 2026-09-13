/** Rest countdown lengths offered in Settings. 0 means the timer is off. */
export const REST_TIMER_CHOICES = [0, 60, 90, 120, 150, 180] as const;

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
