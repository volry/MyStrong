import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, Trash2, Video } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT, MUSCLE_GROUPS, type MuscleGroup, type T } from "@/i18n/dictionaries";
import { formatTarget } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { LibraryPicker } from "./library-picker";
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
    supabase.from("exercises").select("id, name, muscle_group").order("name"),
  ]);
  if (!day) notFound();

  const ids = { program_id: programId, day_id: day.id };
  const muscleLabel = (g: string | null) =>
    g && (MUSCLE_GROUPS as readonly string[]).includes(g) ? t(`muscle.${g as MuscleGroup}`) : null;
  const list = items ?? [];

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

      <form action={updateDay} className="flex max-w-xl gap-2">
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

      <div className="md:grid md:grid-cols-[1fr_320px] md:items-start md:gap-8">
        {/* ---------- planned exercises ---------- */}
        <div className="space-y-4">
          {/* Desktop: table */}
          <div className="hidden md:block">
            {list.length === 0 ? (
              <p className="text-muted-foreground">{t("day.empty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">{t("ex.name")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.sets")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.reps")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.weight")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.time")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.rpe")}</th>
                      <th className="px-2 py-2 font-medium">{t("day.notes")}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((pe, i) => (
                      <tr key={pe.id} className="border-b last:border-0 align-middle">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          <form id={`row-${pe.id}`} action={updateProgramExercise}>
                            <HiddenIds {...ids} />
                            <input type="hidden" name="id" value={pe.id} />
                          </form>
                          <div className="flex items-center gap-2 font-medium">
                            {pe.exercise?.name}
                            {pe.exercise?.youtube_url && <Video className="size-3.5 text-muted-foreground" />}
                          </div>
                          {saved === pe.id && <div className="text-xs text-primary">{t("common.saved")}</div>}
                        </td>
                        <td className="px-2 py-2">
                          <NumInput form={`row-${pe.id}`} name="target_sets" value={pe.target_sets} max={50} />
                        </td>
                        <td className="px-2 py-2">
                          <NumInput form={`row-${pe.id}`} name="target_reps" value={pe.target_reps} max={1000} />
                        </td>
                        <td className="px-2 py-2">
                          <NumInput form={`row-${pe.id}`} name="target_weight" value={pe.target_weight} step="0.5" />
                        </td>
                        <td className="px-2 py-2">
                          <NumInput form={`row-${pe.id}`} name="target_time_sec" value={pe.target_time_sec} />
                        </td>
                        <td className="px-2 py-2">
                          <NumInput form={`row-${pe.id}`} name="target_rpe" value={pe.target_rpe} step="0.5" max={10} />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            form={`row-${pe.id}`}
                            name="coach_notes"
                            defaultValue={pe.coach_notes ?? ""}
                            className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <Button form={`row-${pe.id}`} type="submit" size="sm" variant="secondary">
                              {t("common.save")}
                            </Button>
                            <Button
                              form={`row-${pe.id}`}
                              type="submit"
                              formAction={moveProgramExercise}
                              name="direction"
                              value="up"
                              size="icon-sm"
                              variant="ghost"
                              disabled={i === 0}
                              title={t("common.up")}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              form={`row-${pe.id}`}
                              type="submit"
                              formAction={moveProgramExercise}
                              name="direction"
                              value="down"
                              size="icon-sm"
                              variant="ghost"
                              disabled={i === list.length - 1}
                              title={t("common.down")}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <ConfirmButton
                              form={`row-${pe.id}`}
                              type="submit"
                              formAction={removeProgramExercise}
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive"
                              title={t("day.remove")}
                              message={t("common.confirmDelete")}
                            >
                              <Trash2 className="size-4" />
                            </ConfirmButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden">
            {list.length === 0 ? (
              <p className="text-muted-foreground">{t("day.empty")}</p>
            ) : (
              <ol className="space-y-3">
                {list.map((pe, i) => (
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
                                disabled={i === list.length - 1}
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
          </div>

          {/* Mobile: add exercise with targets */}
          <Card className="md:hidden">
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
              className="w-full text-destructive md:w-auto"
              message={t("common.confirmDelete")}
            >
              {t("prog.deleteDay")}
            </ConfirmButton>
          </form>
        </div>

        {/* Desktop: library panel */}
        <aside className="hidden md:block md:sticky md:top-8">
          <h2 className="mb-2 font-medium">{t("day.library")}</h2>
          {!library || library.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("day.noLibrary")}{" "}
              <Link href="/exercises/new" className="text-primary underline">
                {t("ex.add")}
              </Link>
            </p>
          ) : (
            <LibraryPicker
              exercises={library}
              programId={programId}
              dayId={day.id}
              addAction={addProgramExercise}
              labels={{ search: t("day.search"), empty: t("ex.noMatch"), muscle: muscleLabel }}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("day.libraryHint")}</p>
        </aside>
      </div>
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

function NumInput({
  form,
  name,
  value,
  step,
  max,
}: {
  form: string;
  name: string;
  value: number | null;
  step?: string;
  max?: number;
}) {
  return (
    <input
      form={form}
      name={name}
      type="number"
      min={0}
      max={max}
      step={step ?? "1"}
      defaultValue={value ?? ""}
      className="h-9 w-16 rounded-md border border-input bg-background px-1 text-center text-sm tabular-nums"
    />
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
