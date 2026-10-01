import type { T } from "@/i18n/dictionaries";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Warm-up and cool-down as free text, one item per line. They are read, never
 * logged, so they are plain textareas rather than exercises with targets.
 */
export function DayBlocks({
  t,
  warmup,
  cooldown,
}: {
  t: T;
  warmup: string | null | undefined;
  cooldown: string | null | undefined;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="warmup">{t("day.warmup")}</Label>
        <Textarea
          id="warmup"
          name="warmup"
          rows={3}
          defaultValue={warmup ?? ""}
          placeholder={t("day.warmupExample")}
          className="text-base"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cooldown">{t("day.cooldown")}</Label>
        <Textarea
          id="cooldown"
          name="cooldown"
          rows={3}
          defaultValue={cooldown ?? ""}
          placeholder={t("day.cooldownExample")}
          className="text-base"
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">{t("day.blockHint")}</p>
    </div>
  );
}

/** The same text while training: a short list to read, with nothing to tick. */
export function TextBlock({ title, text }: { title: string; text: string | null | undefined }) {
  const lines = (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="mb-1 text-sm font-medium">{title}</div>
      <ul className="space-y-0.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
