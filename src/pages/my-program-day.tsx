import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ArrowDown, ArrowUp, ChevronLeft, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { TargetFields } from "@/components/target-fields";
import { MuscleBadge } from "@/components/muscle-badges";

const BASE = "/my-programs";

export default function MyDayPage() {
  const { me, programs, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id: programId = "", dayId = "" } = useParams();
  const [search] = useSearchParams();
  const saved = search.get("saved");

  const library = useMemo(
    () => [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name)),
    [exercises],
  );

  const program = programs.find((p) => p.id === programId);
  const day = program?.days.find((d) => d.id === dayId);
  if (!program || program.client_id !== me.id || program.created_by !== me.id) {
    return <Navigate to={BASE} replace />;
  }
  if (!day) return <Navigate to={`${BASE}/${programId}`} replace />;

  const pending = program.review_status === "pending";
  const list = dayItems(day, exercises);
  const notesLabel = t("mine.exerciseNotes");

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={`${BASE}/${programId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {program.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
      </div>

      {pending && <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("mine.locked")}</p>}

      {!pending && (
        <form action={(fd) => updateDay(me, BASE, programId, day.id, fd)} className="flex gap-2">
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
      )}
      {saved === "1" && <p className="-mt-3 text-sm text-primary">{t("common.saved")}</p>}

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
                    {!pending && (
                      <div className="flex shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={i === 0}
                          title={t("common.up")}
                          onClick={() => void moveProgramExercise(me, BASE, programId, day.id, pe.id, "up")}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={i === list.length - 1}
                          title={t("common.down")}
                          onClick={() => void moveProgramExercise(me, BASE, programId, day.id, pe.id, "down")}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <YoutubeEmbed url={pe.exercise?.youtube_url} title={pe.exercise?.name} />
                  {!pending && (
                    <form
                      action={(fd) => updateProgramExercise(me, BASE, programId, day.id, fd)}
                      className="space-y-3"
                    >
                      <input type="hidden" name="id" value={pe.id} />
                      <TargetFields t={t} values={pe} idPrefix={pe.id} notesLabel={notesLabel} />
                      {saved === pe.id && <p className="text-sm text-primary">{t("common.saved")}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" variant="secondary" className="h-11 flex-1">
                          {t("common.save")}
                        </Button>
                        <ConfirmButton
                          type="button"
                          variant="ghost"
                          className="h-11 text-destructive"
                          message={t("common.confirmDelete")}
                          onClick={() => void removeProgramExercise(me, BASE, programId, day.id, pe.id)}
                        >
                          {t("day.remove")}
                        </ConfirmButton>
                      </div>
                    </form>
                  )}
                  {pending && pe.coach_notes && <p className="text-sm text-muted-foreground">{pe.coach_notes}</p>}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      {!pending && (
        <Card>
          <CardHeader>
            <CardTitle>{t("day.addExercise")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {library.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("day.noLibrary")}</p>
            ) : (
              <form action={(fd) => addProgramExercise(me, BASE, programId, day.id, fd)} className="space-y-3">
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
                <TargetFields t={t} idPrefix="new" notesLabel={notesLabel} />
                <Button type="submit" className="h-12 w-full text-base">
                  <Plus className="size-4" />
                  {t("day.addExercise")}
                </Button>
              </form>
            )}
            <Link to="/exercises/new" className="block text-sm text-primary underline-offset-4 hover:underline">
              {t("mine.newExercise")}
            </Link>
          </CardContent>
        </Card>
      )}

      {!pending && (
        <div className="border-t pt-4">
          <ConfirmButton
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            message={t("common.confirmDelete")}
            onClick={() => void deleteDay(me, BASE, programId, day.id)}
          >
            {t("prog.deleteDay")}
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
