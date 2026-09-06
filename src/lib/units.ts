export type Unit = "kg" | "lb";

const LB_PER_KG = 2.2046226218;

export function kgToUnit(kg: number, unit: Unit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}

export function unitToKg(value: number, unit: Unit): number {
  const kg = unit === "lb" ? value / LB_PER_KG : value;
  return Math.round(kg * 100) / 100;
}

/** Weight stored in kg, shown in the user's unit, rounded to 0.25. */
export function formatWeight(kg: number | null | undefined, unit: Unit): string {
  if (kg == null) return "";
  const v = Math.round(kgToUnit(kg, unit) * 4) / 4;
  return String(v);
}
