"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Client's name as a heading with a small pencil; tap to rename inline. */
export function ClientName({
  id,
  name,
  email,
  action,
  labels,
}: {
  id: string;
  name: string | null;
  email: string;
  action: (formData: FormData) => void | Promise<void>;
  labels: { rename: string; save: string; cancel: string };
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{name ?? email}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={labels.rename}
          title={labels.rename}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input
        name="full_name"
        defaultValue={name ?? ""}
        maxLength={80}
        autoFocus
        aria-label={labels.rename}
        className="h-10 max-w-xs text-lg font-semibold"
      />
      <button
        type="submit"
        aria-label={labels.save}
        title={labels.save}
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <Check className="size-4" strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label={labels.cancel}
        title={labels.cancel}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </form>
  );
}
