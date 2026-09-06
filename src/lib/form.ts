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
