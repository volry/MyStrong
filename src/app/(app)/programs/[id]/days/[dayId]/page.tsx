import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT, type T } from "@/i18n/dictionaries";
import { formatTarget } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import {
  addProgramExercise,
  deleteDay,
  moveProgramExercise,
  removeProgramExercise,
  updateDay,
  updateProgramExercise,
} from "../../../actions";

export default async function DayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; dayId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id: programId, dayId } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();
  const [{ data: day }, { data: items }, { data: library }] = await Promise.all([
    supabase
      .from("program_days")
      .select("id, week_no, day_no, title, program:programs!inner(id, name)")
      .eq("id", dayId)
      .eq("program_id", programId)
      .maybeSingle(),
    supabase
      .from("program_exercises")
      .select(
        "id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes, exercise:exercises(id, name, youtube_url)",
      )
      .eq("program_day_id", dayId)
      .order("position"),
    supabase.from("exercises").select("id, name").order("name"),
  ]);
  if (!day) notFound();

  const ids = { program_id: programId, day_id: day.id };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/programs/${programId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {day.program.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
      </div>

      <form action={updateDay} className="flex gap-2">
        <HiddenIds {...ids} />
        <Input
          name="title"
          defaultValue={day.title ?? ""}
          placeholder={t("prog.dayTitle")}
          className="h-12 flex-1 text-base"
        />
        <Button type="submit" variant="secondary" className="h-12">
          {t("common.save")}
        </Button>
      </form>
      {saved === "1" && <p className="-mt-4 text-sm text-primary">{t("common.saved")}</p>}

      {/* Planned exercises */}
      {!items || items.length === 0 ? (
        <p className="text-muted-foreground">{t("day.empty")}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((pe, i) => (
            <li key={pe.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {i + 1}. {pe.exercise?.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{formatTarget(pe)}</p>
                    </div>
                    <div className="flex shrink-0">
                      <form action={moveProgramExercise}>
                        <HiddenIds {...ids} />
                        <input type="hidden" name="id" value={pe.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button type="submit" variant="ghost" size="icon" disabled={i === 0} title={t("common.up")}>
                          <ArrowUp className="size-4" />
                        </Button>
                      </form>
                      <form action={moveProgramExercise}>
                        <HiddenIds {...ids} />
                        <input type="hidden" name="id" value={pe.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          disabled={i === items.length - 1}
                          title={t("common.down")}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <YoutubeEmbed url={pe.exercise?.youtube_url} title={pe.exercise?.name} />
                  <form action={updateProgramExercise} className="space-y-3">
                    <HiddenIds {...ids} />
                    <input type="hidden" name="id" value={pe.id} />
                    <TargetFields t={t} values={pe} idPrefix={pe.id} />
                    {saved === pe.id && <p className="text-sm text-primary">{t("common.saved")}</p>}
                    <div className="flex gap-2">
                      <Button type="submit" variant="secondary" className="h-11 flex-1">
                        {t("common.save")}
                      </Button>
                      <ConfirmButton
                        type="submit"
                        formAction={removeProgramExercise}
                        variant="ghost"
                        className="h-11 text-destructive"
                        message={t("common.confirmDelete")}
                      >
                        {t("day.remove")}
                      </ConfirmButton>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {/* Add exercise */}
      <Card>
        <CardHeader>
          <CardTitle>{t("day.addExercise")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!library || library.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("day.noLibrary")}{" "}
              <Link href="/exercises/new" className="text-primary underline">
                {t("ex.add")}
              </Link>
            </p>
          ) : (
            <form action={addProgramExercise} className="space-y-3">
              <HiddenIds {...ids} />
              <div className="space-y-2">
                <Label htmlFor="exercise_id">{t("day.pick")}</Label>
                <select
                  id="exercise_id"
                  name="exercise_id"
                  required
                  defaultValue=""
                  className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {library.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <TargetFields t={t} idPrefix="new" />
              <Button type="submit" className="h-12 w-full text-base">
                {t("day.addExercise")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <form action={deleteDay} className="border-t pt-4">
        <HiddenIds {...ids} />
        <ConfirmButton
          type="submit"
          variant="ghost"
          className="w-full text-destructive"
          message={t("common.confirmDelete")}
        >
          {t("prog.deleteDay")}
        </ConfirmButton>
      </form>
    </div>
  );
}

function HiddenIds({ program_id, day_id }: { program_id: string; day_id: string }) {
  return (
    <>
      <input type="hidden" name="program_id" value={program_id} />
      <input type="hidden" name="day_id" value={day_id} />
    </>
  );
}

type TargetValues = {
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_time_sec: number | null;
  target_rpe: number | null;
  coach_notes: string | null;
};

function TargetFields({ t, values, idPrefix }: { t: T; values?: TargetValues; idPrefix: string }) {
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
          {t("day.notes")}
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
