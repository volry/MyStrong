"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveExercise, type ExerciseFormState } from "./actions";
import { makeT, MUSCLE_GROUPS, type Locale } from "@/i18n/dictionaries";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ExerciseFormValues = {
  id: string;
  name: string;
  muscle_group: string | null;
  youtube_url: string | null;
  description: string | null;
};

export function ExerciseForm({
  locale,
  exercise,
}: {
  locale: Locale;
  exercise?: ExerciseFormValues;
}) {
  const t = makeT(locale);
  const [state, formAction, pending] = useActionState<ExerciseFormState, FormData>(
    saveExercise,
    null,
  );
  const [url, setUrl] = useState(exercise?.youtube_url ?? "");

  return (
    <form action={formAction} className="space-y-4">
      {exercise && <input type="hidden" name="id" value={exercise.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">{t("ex.name")}</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={exercise?.name ?? ""}
          autoFocus={!exercise}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="muscle_group">{t("ex.muscle")}</Label>
        <select
          id="muscle_group"
          name="muscle_group"
          defaultValue={exercise?.muscle_group ?? ""}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          <option value="">—</option>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {t(`muscle.${g}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_url">{t("ex.video")}</Label>
        <Input
          id="youtube_url"
          name="youtube_url"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          placeholder="https://youtu.be/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">{t("ex.videoHint")}</p>
        <YoutubeEmbed url={url} title={exercise?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("ex.description")}</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={exercise?.description ?? ""}
          className="text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{t(state.error)}</p>}

      <div className="flex gap-3">
        <Button
          render={<Link href="/exercises" />}
          variant="outline"
          className="h-12 flex-1 text-base"
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" className="h-12 flex-1 text-base" disabled={pending}>
          {pending ? t("login.working") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
