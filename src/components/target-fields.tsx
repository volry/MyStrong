import type { T } from "@/i18n/dictionaries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TargetValues = {
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time_sec: number | null;
  target_rpe: number | null;
  coach_notes: string | null;
};

/** Sets / reps / weight / time / RPE / notes inputs. Used by the coach and client program builders. */
export function TargetFields({
  t,
  values,
  idPrefix,
  notesLabel,
}: {
  t: T;
  values?: TargetValues;
  idPrefix: string;
  /** Defaults to "Coach notes"; the client builder labels the same column differently. */
  notesLabel?: string;
}) {
  const field = (
    name: keyof TargetValues,
    label: string,
    opts: { step?: string; inputMode: "numeric" | "decimal"; max?: number },
  ) => (
    <div className="space-y-1">
      <Label htmlFor={`${idPrefix}-${name}`} className="text-xs">
        {label}
      </Label>
      <Input
        id={`${idPrefix}-${name}`}
        name={name}
        type="number"
        min={0}
        max={opts.max}
        step={opts.step ?? "1"}
        inputMode={opts.inputMode}
        defaultValue={values?.[name] ?? ""}
        className="h-11 px-2 text-center text-base"
      />
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {field("target_sets", t("day.sets"), { inputMode: "numeric", max: 50 })}
        {field("target_reps", t("day.reps"), { inputMode: "numeric", max: 1000 })}
        {field("target_weight", t("day.weight"), { inputMode: "decimal", step: "0.5" })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {field("target_time_sec", t("day.time"), { inputMode: "numeric" })}
        {field("target_rpe", t("day.rpe"), { inputMode: "decimal", step: "0.5", max: 10 })}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-coach_notes`} className="text-xs">
          {notesLabel ?? t("day.notes")}
        </Label>
        <Input
          id={`${idPrefix}-coach_notes`}
          name="coach_notes"
          defaultValue={values?.coach_notes ?? ""}
          className="h-11 text-base"
        />
      </div>
    </>
  );
}
