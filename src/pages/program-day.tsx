import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, ChevronLeft, Trash2, Video } from "lucide-react";
import { useData } from "@/data/store";
import {
  addProgramExercise,
  deleteDay,
  moveProgramExercise,
  removeProgramExercise,
  updateDay,
  updateProgramExercise,
} from "@/data/actions/programs";
import { dayItems } from "@/lib/client-data";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatTarget } from "@/lib/format";
import { muscleLabel } from "@/lib/muscles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { TargetFields } from "@/components/target-fields";
import { MuscleBadge } from "@/components/muscle-badges";
import { LibraryPicker } from "@/components/library-picker";
import { DayBlocks } from "@/components/day-blocks";
import { ExercisePicker } from "@/components/exercise-picker";

const BASE = "/programs";

export default function DayPage() {
  const { me: coach, programs, exercises, workouts } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id: programId = "", dayId = "" } = useParams();
  const [search] = useSearchParams();
  const saved = search.get("saved");
  const error = search.get("error");

  const library = useMemo(
    () => [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );

  if (coach.role !== "coach") return <Navigate to="/" replace />;
  const program = programs.find((p) => p.id === programId);
  const found = program?.days.find((d) => d.id === dayId);
  if (!program) return <Navigate to="/" replace />;
  if (!found) return <Navigate to={`${BASE}/${programId}`} replace />;
  const day = { ...found, program: { id: program.id, name: program.name } };

  const list = dayItems(found, exercises);
  const move = (id: string, direction: "up" | "down") =>
    void moveProgramExercise(coach, BASE, programId, day.id, id, direction);
  const remove = (id: string) => void removeProgramExercise(coach, BASE, programId, day.id, id, workouts);
  const save = (fd: FormData) => updateProgramExercise(coach, BASE, programId, day.id, fd);
  const add = (fd: FormData) => addProgramExercise(coach, BASE, programId, day.id, fd);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/programs/${programId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {day.program.name}
        </Link>
        <h1 className="text-[2rem] leading-tight font-bold">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
      </div>

      {error === "logged" && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{t("day.hasLogs")}</p>
      )}

      {/* Keyed on the saved values so the fields show them after a save. */}
      <form
        key={`${day.title}|${day.warmup}|${day.cooldown}`}
        action={(fd) => updateDay(coach, BASE, programId, day.id, fd)}
        className="max-w-xl space-y-3"
      >
        <div className="flex gap-2">
          <Input
            name="title"
            defaultValue={day.title ?? ""}
            placeholder={t("prog.dayTitle")}
            className="h-12 flex-1 text-base"
          />
          <Button type="submit" variant="secondary" className="h-12">
            {t("common.save")}
          </Button>
        </div>
        <DayBlocks t={t} warmup={day.warmup} cooldown={day.cooldown} />
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
                          <form id={`row-${pe.id}`} action={save}>
                            <input type="hidden" name="id" value={pe.id} />
                          </form>
                          <div className="flex items-center gap-2 font-medium">
                            {pe.exercise?.name}
                            {pe.exercise?.youtube_url && <Video className="size-3.5 text-muted-foreground" />}
                          </div>
                          {muscleLabel(t, pe.exercise?.muscle_group) && (
                            <div className="text-xs text-muted-foreground">
                              {muscleLabel(t, pe.exercise?.muscle_group)}
                            </div>
                          )}
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
                              type="button"
                              onClick={() => move(pe.id, "up")}
                              size="icon-sm"
                              variant="ghost"
                              disabled={i === 0}
                              title={t("common.up")}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              onClick={() => move(pe.id, "down")}
                              size="icon-sm"
                              variant="ghost"
                              disabled={i === list.length - 1}
                              title={t("common.down")}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <ConfirmButton
                              type="button"
                              onClick={() => remove(pe.id)}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <MuscleBadge group={pe.exercise?.muscle_group} t={t} />
                              <p className="text-sm text-muted-foreground">{formatTarget(pe)}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={i === 0}
                              title={t("common.up")}
                              onClick={() => move(pe.id, "up")}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={i === list.length - 1}
                              title={t("common.down")}
                              onClick={() => move(pe.id, "down")}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <YoutubeEmbed url={pe.exercise?.youtube_url} title={pe.exercise?.name} />
                        <form action={save} className="space-y-3">
                          <input type="hidden" name="id" value={pe.id} />
                          <TargetFields t={t} values={pe} idPrefix={pe.id} />
                          {saved === pe.id && <p className="text-sm text-primary">{t("common.saved")}</p>}
                          <div className="flex gap-2">
                            <Button type="submit" variant="secondary" className="h-11 flex-1">
                              {t("common.save")}
                            </Button>
                            <ConfirmButton
                              type="button"
                              onClick={() => remove(pe.id)}
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
              {library.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("day.noLibrary")}{" "}
                  <Link to="/exercises/new" className="text-primary underline">
                    {t("ex.add")}
                  </Link>
                </p>
              ) : (
                <form action={add} className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t("day.pick")}</Label>
                    <ExercisePicker exercises={library} locale={locale} />
                  </div>
                  <TargetFields t={t} idPrefix="new" />
                  <Button type="submit" className="h-12 w-full text-base">
                    {t("day.addExercise")}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="border-t pt-4">
            <ConfirmButton
              type="button"
              onClick={() => void deleteDay(coach, BASE, programId, day.id)}
              variant="ghost"
              className="w-full text-destructive md:w-auto"
              message={t("common.confirmDelete")}
            >
              {t("prog.deleteDay")}
            </ConfirmButton>
          </div>
        </div>

        {/* Desktop: library panel */}
        <aside className="hidden md:block md:sticky md:top-8">
          <h2 className="mb-2 font-medium">{t("day.library")}</h2>
          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("day.noLibrary")}{" "}
              <Link to="/exercises/new" className="text-primary underline">
                {t("ex.add")}
              </Link>
            </p>
          ) : (
            <LibraryPicker
              exercises={library.map((e) => ({ id: e.id, name: e.name, muscle_label: muscleLabel(t, e.muscle_group) }))}
              onAdd={(exerciseId) => {
                const fd = new FormData();
                fd.set("exercise_id", exerciseId);
                void add(fd);
              }}
              labels={{ search: t("day.search"), empty: t("ex.noMatch") }}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t("day.libraryHint")}</p>
        </aside>
      </div>
    </div>
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
