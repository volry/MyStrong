import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Copy, MessageSquare, Play, Plus, Send } from "lucide-react";
import { useData } from "@/data/store";
import {
  addDay,
  addWeek,
  deleteProgram,
  deleteWeek,
  duplicateWeek,
  setProgramActive,
  submitMyProgram,
  updateProgram,
  withdrawMyProgram,
} from "@/data/actions/programs";
import { sortedDays } from "@/lib/client-data";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { go } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { ReviewBadge } from "@/components/review-badge";
import type { ProgramDayDoc } from "@/data/types";

const BASE = "/my-programs";

export default function MyProgramPage() {
  const { me, programs } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const flags = {
    saved: search.get("saved"),
    error: search.get("error"),
    submitted: search.get("submitted"),
    activated: search.get("activated"),
    deactivated: search.get("deactivated"),
  };

  const program = programs.find((p) => p.id === id);
  // Only the person who wrote it edits it here; coach programs live in the coach's builder.
  if (!program || program.client_id !== me.id || program.created_by !== me.id) {
    return <Navigate to={BASE} replace />;
  }

  const pending = program.review_status === "pending";
  const days = sortedDays(program.days);
  const weeks = new Map<number, ProgramDayDoc[]>();
  for (const d of days) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }
  const dayCount = days.length;
  const exerciseCount = days.reduce((n, d) => n + d.items.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <Link to={BASE} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("mine.title")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[2rem] leading-tight font-bold">{program.name}</h1>
          {program.is_active && <Badge>{t("client.active")}</Badge>}
          <ReviewBadge status={program.review_status} t={t} />
        </div>
      </div>

      {flags.submitted && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("mine.submitted")}</p>
      )}
      {flags.activated && (
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("mine.activated")}</p>
      )}
      {flags.deactivated && (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("mine.deactivated")}</p>
      )}
      {flags.error === "locked" && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{t("mine.locked")}</p>
      )}

      {program.coach_feedback && program.review_status !== "pending" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-primary" />
              {t("mine.feedback")}
              {program.reviewed_at && (
                <span className="text-xs font-normal text-muted-foreground">
                  {formatDate(program.reviewed_at, locale)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{program.coach_feedback}</CardContent>
        </Card>
      )}

      {pending ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm">{t("mine.waiting")}</p>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base"
              onClick={() => withdrawMyProgram(program.id)}
            >
              {t("mine.withdraw")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            variant={program.is_active ? "outline" : "default"}
            disabled={exerciseCount === 0}
            className="h-12 w-full text-base"
            onClick={() => {
              const active = !program.is_active;
              setProgramActive(me, programs, program, active);
              go(`${BASE}/${program.id}?${active ? "activated" : "deactivated"}=1`, { replace: true });
            }}
          >
            {!program.is_active && <Play className="size-4" fill="currentColor" />}
            {program.is_active ? t("mine.stopUsing") : t("mine.useIt")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {exerciseCount === 0 ? t("mine.needExercises") : t("mine.activeHint")}
          </p>

          {me.role !== "coach" && (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={exerciseCount === 0}
                className="h-12 w-full text-base"
                onClick={() => void submitMyProgram(me, program.id)}
              >
                <Send className="size-4" />
                {program.review_status === "self" ? t("mine.submit") : t("mine.resubmit")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("mine.submitHint")}</p>
            </>
          )}
        </div>
      )}

      {/* Days by week */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          {t("mine.plan")}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{t("mine.days", { n: dayCount })}</span>
        </h2>

        {weeks.size === 0 && <p className="text-muted-foreground">{t("prog.noDays")}</p>}

        {[...weeks.entries()].map(([weekNo, weekDays]) => (
          <div key={weekNo} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t("prog.week", { n: weekNo })}</h3>
              {!pending && (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title={t("prog.duplicateWeek")}
                    onClick={() => void duplicateWeek(me, BASE, program.id, weekNo)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <ConfirmButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    message={t("common.confirmDelete")}
                    onClick={() => void deleteWeek(me, BASE, program.id, weekNo)}
                  >
                    {t("common.delete")}
                  </ConfirmButton>
                </div>
              )}
            </div>
            <ul className="divide-y rounded-xl border">
              {weekDays.map((d) => (
                <li key={d.id}>
                  <Link to={`${BASE}/${program.id}/days/${d.id}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {t("prog.day", { n: d.day_no })}
                        {d.title ? ` · ${d.title}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("prog.exercises", { n: d.items.length })}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {!pending && (
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-primary"
                    onClick={() => void addDay(me, BASE, program.id, weekNo)}
                  >
                    <Plus className="size-4" />
                    {t("prog.addDay")}
                  </button>
                </li>
              )}
            </ul>
          </div>
        ))}

        {!pending && (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            onClick={() => void addWeek(me, BASE, program.id)}
          >
            <Plus className="size-4" />
            {t("prog.addWeek")}
          </Button>
        )}
      </section>

      {!pending && (
        <section className="space-y-4 border-t pt-5">
          <form action={(fd) => updateProgram(me, BASE, fd)} className="space-y-3">
            <input type="hidden" name="id" value={program.id} />
            <div className="space-y-2">
              <Label htmlFor="name">{t("prog.name")}</Label>
              <Input id="name" name="name" required defaultValue={program.name} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("prog.startDate")}</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={program.start_date ?? ""}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">{t("mine.notes")}</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={program.notes ?? ""} className="text-base" />
            </div>
            {flags.saved && <p className="text-sm text-primary">{t("common.saved")}</p>}
            <Button type="submit" variant="secondary" className="h-12 w-full text-base">
              {t("common.save")}
            </Button>
          </form>

          <ConfirmButton
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            message={t("common.confirmDelete")}
            onClick={() => deleteProgram(BASE, program)}
          >
            {t("prog.delete")}
          </ConfirmButton>
        </section>
      )}
    </div>
  );
}
