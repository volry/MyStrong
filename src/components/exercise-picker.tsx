"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { makeT, MUSCLE_GROUPS, type Locale, type MuscleGroup } from "@/i18n/dictionaries";
import { isMuscleGroup, MUSCLE_BADGE } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PickerExercise = { id: string; name: string; muscle_group: string | null };

/**
 * Choosing an exercise out of a library of seventy, on a phone, mid-session: a
 * search box, a chip per muscle group actually present, and a list you scroll.
 * The chosen id rides along in a hidden input, so this drops into a plain form
 * as a replacement for a <select>; `onChange` is for callers driving it in state.
 */
export function ExercisePicker({
  exercises,
  locale,
  value,
  onChange,
  name = "exercise_id",
}: {
  exercises: PickerExercise[];
  locale: Locale;
  value?: string;
  onChange?: (id: string) => void;
  name?: string;
}) {
  const t = makeT(locale);
  const [internal, setInternal] = useState("");
  const selected = value ?? internal;
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  // Only the groups this library actually covers.
  const groups = useMemo(() => {
    const present = new Set(exercises.map((e) => e.muscle_group).filter(isMuscleGroup));
    return MUSCLE_GROUPS.filter((g) => present.has(g));
  }, [exercises]);

  function matches(e: PickerExercise, needle: string, only: MuscleGroup | null) {
    if (only && e.muscle_group !== only) return false;
    return !needle || e.name.toLowerCase().includes(needle);
  }

  const filtered = useMemo(
    () => exercises.filter((e) => matches(e, query.trim().toLowerCase(), group)),
    [exercises, query, group],
  );

  function select(id: string) {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  }

  function pick(id: string) {
    // Tapping the chosen one again clears it.
    select(id === selected ? "" : id);
  }

  /**
   * Narrowing the list drops a choice it hides — otherwise "Add" would take an
   * exercise that is no longer on screen.
   */
  function filter(nextQuery: string, nextGroup: MuscleGroup | null) {
    setQuery(nextQuery);
    setGroup(nextGroup);
    const chosen = exercises.find((e) => e.id === selected);
    if (chosen && !matches(chosen, nextQuery.trim().toLowerCase(), nextGroup)) select("");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={selected} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => filter(e.target.value, group)}
          placeholder={t("ex.search")}
          className="h-11 pl-9 text-base"
        />
      </div>

      {groups.length > 1 && (
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max gap-2 pb-1">
            <Chip label={t("ex.allGroups")} active={!group} onClick={() => filter(query, null)} />
            {groups.map((g) => (
              <Chip
                key={g}
                label={t(`muscle.${g}`)}
                active={group === g}
                onClick={() => filter(query, group === g ? null : g)}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("ex.noMatch")}</p>
      ) : (
        <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border bg-background">
          {filtered.map((e) => {
            const isSelected = e.id === selected;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => pick(e.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left",
                    isSelected && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  {isMuscleGroup(e.muscle_group) && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs",
                        MUSCLE_BADGE[e.muscle_group],
                      )}
                    >
                      {t(`muscle.${e.muscle_group}`)}
                    </span>
                  )}
                  {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("ex.count", { n: filtered.length })}</p>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
