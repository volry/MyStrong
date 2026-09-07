"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type LibraryExercise = { id: string; name: string; muscle_group: string | null };

/** Desktop: searchable exercise library with one-click add into the current day. */
export function LibraryPicker({
  exercises,
  programId,
  dayId,
  addAction,
  labels,
}: {
  exercises: LibraryExercise[];
  programId: string;
  dayId: string;
  addAction: (formData: FormData) => void | Promise<void>;
  labels: { search: string; empty: string; muscle: (g: string | null) => string | null };
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? exercises.filter((e) => e.name.toLowerCase().includes(needle)) : exercises;
  }, [exercises, q]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.search}
          className="h-10 pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border bg-card">
          {filtered.map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{e.name}</div>
                {labels.muscle(e.muscle_group) && (
                  <div className="text-xs text-muted-foreground">{labels.muscle(e.muscle_group)}</div>
                )}
              </div>
              <form action={addAction}>
                <input type="hidden" name="program_id" value={programId} />
                <input type="hidden" name="day_id" value={dayId} />
                <input type="hidden" name="exercise_id" value={e.id} />
                <button
                  type="submit"
                  className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                  aria-label={`+ ${e.name}`}
                >
                  <Plus className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
