import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, Plus } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatTarget } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { TargetFields } from "@/components/target-fields";
import {
  addMyProgramExercise,
  deleteMyDay,
  moveMyProgramExercise,
  removeMyProgramExercise,
  updateMyDay,
  updateMyProgramExercise,
} from "../../../actions";

export default async function MyDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; dayId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { id: programId, dayId } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();
  const [{ data: day }, { data: items }, { data: library }] = await Promise.all([
    supabase
      .from("program_days")
      .select(
        "id, week_no, day_no, title, program:programs!inner(id, name, review_status, client_id, created_by)",
      )
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
  if (!day || day.program.client_id !== profile.id || day.program.created_by !== profile.id) notFound();

  const pending = day.program.review_status === "pending";
  const list = items ?? [];
  const ids = { program_id: programId, day_id: day.id };
  const notesLabel = t("mine.exerciseNotes");

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/my-programs/${programId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {day.program.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
      </div>

      {pending && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("mine.locked")}</p>
      )}

      {!pending && (
        <form action={updateMyDay} className="flex gap-2">
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
                      <p className="text-sm text-muted-foreground">{formatTarget(pe)}</p>
                    </div>
                    {!pending && (
                      <div className="flex shrink-0">
                        <form action={moveMyProgramExercise}>
                          <HiddenIds {...ids} />
                          <input type="hidden" name="id" value={pe.id} />
                          <input type="hidden" name="direction" value="up" />
                          <Button type="submit" variant="ghost" size="icon" disabled={i === 0} title={t("common.up")}>
                            <ArrowUp className="size-4" />
                          </Button>
                        </form>
                        <form action={moveMyProgramExercise}>
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
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <YoutubeEmbed url={pe.exercise?.youtube_url} title={pe.exercise?.name} />
                  {!pending && (
                    <form action={updateMyProgramExercise} className="space-y-3">
                      <HiddenIds {...ids} />
                      <input type="hidden" name="id" value={pe.id} />
                      <TargetFields t={t} values={pe} idPrefix={pe.id} notesLabel={notesLabel} />
                      {saved === pe.id && <p className="text-sm text-primary">{t("common.saved")}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" variant="secondary" className="h-11 flex-1">
                          {t("common.save")}
                        </Button>
                        <ConfirmButton
                          type="submit"
                          formAction={removeMyProgramExercise}
                          variant="ghost"
                          className="h-11 text-destructive"
                          message={t("common.confirmDelete")}
                        >
                          {t("day.remove")}
                        </ConfirmButton>
                      </div>
                    </form>
                  )}
                  {pending && pe.coach_notes && (
                    <p className="text-sm text-muted-foreground">{pe.coach_notes}</p>
                  )}
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
            {!library || library.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("day.noLibrary")}</p>
            ) : (
              <form action={addMyProgramExercise} className="space-y-3">
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
                <TargetFields t={t} idPrefix="new" notesLabel={notesLabel} />
                <Button type="submit" className="h-12 w-full text-base">
                  <Plus className="size-4" />
                  {t("day.addExercise")}
                </Button>
              </form>
            )}
            <Link href="/exercises/new" className="block text-sm text-primary underline-offset-4 hover:underline">
              {t("mine.newExercise")}
            </Link>
          </CardContent>
        </Card>
      )}

      {!pending && (
        <form action={deleteMyDay} className="border-t pt-4">
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
      )}
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
