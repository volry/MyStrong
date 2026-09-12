import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, MessageSquare, Play, Plus, Send } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { ReviewBadge } from "@/components/review-badge";
import {
  addMyDay,
  addMyWeek,
  deleteMyProgram,
  deleteMyWeek,
  duplicateMyWeek,
  setMyProgramActive,
  submitMyProgram,
  updateMyProgram,
  withdrawMyProgram,
} from "../actions";

type Search = {
  saved?: string;
  error?: string;
  submitted?: string;
  activated?: string;
  deactivated?: string;
};

export default async function MyProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { id } = await params;
  const flags = await searchParams;

  const supabase = await createClient();
  const [{ data: program }, { data: days }] = await Promise.all([
    supabase
      .from("programs")
      .select(
        "id, name, start_date, notes, is_active, review_status, coach_feedback, reviewed_at, client_id, created_by",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("program_days")
      .select("id, week_no, day_no, title, program_exercises(count)")
      .eq("program_id", id)
      .order("week_no")
      .order("day_no"),
  ]);
  // Only the person who wrote it edits it here; coach programs live in the coach's builder.
  if (!program || program.client_id !== profile.id || program.created_by !== profile.id) notFound();

  const pending = program.review_status === "pending";
  const weeks = new Map<number, NonNullable<typeof days>>();
  for (const d of days ?? []) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }
  const dayCount = days?.length ?? 0;
  const exerciseCount = (days ?? []).reduce((n, d) => n + (d.program_exercises[0]?.count ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/my-programs" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {t("mine.title")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
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
            <form action={withdrawMyProgram}>
              <input type="hidden" name="id" value={program.id} />
              <Button type="submit" variant="outline" className="h-12 w-full text-base">
                {t("mine.withdraw")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <form action={setMyProgramActive}>
            <input type="hidden" name="id" value={program.id} />
            <input type="hidden" name="active" value={program.is_active ? "0" : "1"} />
            <Button
              type="submit"
              variant={program.is_active ? "outline" : "default"}
              disabled={exerciseCount === 0}
              className="h-12 w-full text-base"
            >
              {!program.is_active && <Play className="size-4" fill="currentColor" />}
              {program.is_active ? t("mine.stopUsing") : t("mine.useIt")}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            {exerciseCount === 0 ? t("mine.needExercises") : t("mine.activeHint")}
          </p>

          {profile.role !== "coach" && (
            <>
              <form action={submitMyProgram}>
                <input type="hidden" name="id" value={program.id} />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={exerciseCount === 0}
                  className="h-12 w-full text-base"
                >
                  <Send className="size-4" />
                  {program.review_status === "self" ? t("mine.submit") : t("mine.resubmit")}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground">{t("mine.submitHint")}</p>
            </>
          )}
        </div>
      )}

      {/* Days by week */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          {t("mine.plan")}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {t("mine.days", { n: dayCount })}
          </span>
        </h2>

        {weeks.size === 0 && <p className="text-muted-foreground">{t("prog.noDays")}</p>}

        {[...weeks.entries()].map(([weekNo, weekDays]) => (
          <div key={weekNo} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{t("prog.week", { n: weekNo })}</h3>
              {!pending && (
                <div className="flex gap-1">
                  <form action={duplicateMyWeek}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <input type="hidden" name="week_no" value={weekNo} />
                    <Button type="submit" variant="ghost" size="sm" title={t("prog.duplicateWeek")}>
                      <Copy className="size-4" />
                    </Button>
                  </form>
                  <form action={deleteMyWeek}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <input type="hidden" name="week_no" value={weekNo} />
                    <ConfirmButton
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      message={t("common.confirmDelete")}
                    >
                      {t("common.delete")}
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </div>
            <ul className="divide-y rounded-xl border">
              {weekDays.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/my-programs/${program.id}/days/${d.id}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {t("prog.day", { n: d.day_no })}
                        {d.title ? ` · ${d.title}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("prog.exercises", { n: d.program_exercises[0]?.count ?? 0 })}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
              {!pending && (
                <li>
                  <form action={addMyDay}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <input type="hidden" name="week_no" value={weekNo} />
                    <button type="submit" className="flex w-full items-center gap-2 px-4 py-3 text-sm text-primary">
                      <Plus className="size-4" />
                      {t("prog.addDay")}
                    </button>
                  </form>
                </li>
              )}
            </ul>
          </div>
        ))}

        {!pending && (
          <form action={addMyWeek}>
            <input type="hidden" name="program_id" value={program.id} />
            <Button type="submit" variant="outline" className="h-12 w-full text-base">
              <Plus className="size-4" />
              {t("prog.addWeek")}
            </Button>
          </form>
        )}
      </section>

      {!pending && (
        <section className="space-y-4 border-t pt-5">
          <form action={updateMyProgram} className="space-y-3">
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

          <form action={deleteMyProgram}>
            <input type="hidden" name="id" value={program.id} />
            <ConfirmButton
              type="submit"
              variant="ghost"
              className="w-full text-destructive"
              message={t("common.confirmDelete")}
            >
              {t("prog.delete")}
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
