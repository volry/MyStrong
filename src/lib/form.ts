/** Small helpers for reading FormData in server actions. */

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function int(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function num(fd: FormData, key: string): number | null {
  const s = str(fd, key).replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function nullable(s: string): string | null {
  return s === "" ? null : s;
}

/** Free-text block (warm-up, cool-down): trimmed, capped to what the column allows. */
export function text(fd: FormData, key: string, max = 2000): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s === "" ? null : s;
}
