"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check } from "lucide-react";
import type { T } from "@/i18n/dictionaries";
import { FOCUS_LABEL, FOCUS_METRICS, type FocusMetric, type FocusTotals } from "@/lib/focus-metric";
import { cn } from "@/lib/utils";

/**
 * Pick the number to watch for this exercise, with today's value beside each
 * option so the choice is made against real figures.
 */
export function FocusMetricPicker({
  t,
  exerciseName,
  totals,
  unit,
  selected,
  onSelect,
  open,
  onOpenChange,
}: {
  t: T;
  exerciseName: string;
  totals: FocusTotals;
  unit: string;
  selected: FocusMetric;
  onSelect: (metric: FocusMetric) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="border-b px-4 py-3">
            <Dialog.Title className="text-base font-semibold">{t("focus.title")}</Dialog.Title>
            <p className="truncate text-xs text-muted-foreground">{exerciseName}</p>
          </div>

          <ul className="divide-y">
            {FOCUS_METRICS.map((metric) => {
              const active = metric === selected;
              return (
                <li key={metric}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(metric);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left",
                      active && "bg-secondary",
                    )}
                  >
                    <span className="flex-1 font-medium">{t(FOCUS_LABEL[metric])}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatFocus(metric, totals, t, unit)}
                    </span>
                    <Check className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-0")} />
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="border-t px-4 py-2 text-xs text-muted-foreground">{t("focus.hint")}</p>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The value of one metric, ready to show. Weights are already in the display unit. */
export function formatFocus(metric: FocusMetric, totals: FocusTotals, t: T, unit: string): string {
  switch (metric) {
    case "volume":
      return totals.volume > 0 ? `${Math.round(totals.volume)} ${unit}` : "—";
    case "reps":
      return totals.reps > 0 ? t("focus.valueReps", { n: totals.reps }) : "—";
    case "top_weight":
      return totals.topWeight != null ? `${totals.topWeight} ${unit}` : "—";
    case "volume_change":
      return totals.volumeChange != null
        ? `${totals.volumeChange > 0 ? "+" : ""}${totals.volumeChange}%`
        : "—";
  }
}
