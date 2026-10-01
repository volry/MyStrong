import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { Check, ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { useData } from "@/data/store";
import {
  addDay,
  addWeek,
  copyProgram,
  deleteProgram,
  deleteWeek,
  duplicateWeek,
  reviewProgram,
  setProgramActive,
  updateProgram,
} from "@/data/actions/programs";
import { sortedDays } from "@/lib/client-data";
import { useLocale } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import { makeT } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/confirm-button";
import { ReviewBadge } from "@/components/review-badge";
import type { ProgramDayDoc } from "@/data/types";

const BASE = "/programs";

export default function ProgramPage() {
  const { me: coach, programs, users } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const saved = search.get("saved");
  const error = search.get("error");
  const reviewed = search.get("reviewed");

  // Copy targets: every client, plus the coach's own account.
  const targets = useMemo(
    () =>
      [...users.values()]
        .filter((p) => p.role === "client" || p.id === coach.id)
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    [users, coach.id],
  );

  if (coach.role !== "coach") return <Navigate to="/" replace />;
  const program = programs.find((p) => p.id === id);
  if (!program) return <Navigate to="/" replace />;

  const weeks = new Map<number, ProgramDayDoc[]>();
  for (const d of sortedDays(program.days)) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }
  const client = users.get(program.client_id);
  const clientName = client?.full_name ?? client?.email ?? "";
  // Written by the client for themselves: the coach reviews it instead of owning it.
  const clientMade = program.created_by === program.client_id && program.client_id !== coach.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/clients/${program.client_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {clientName}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[2rem] leading-tight font-bold">{program.name}</h1>
          {program.is_active && <Badge>{t("client.active")}</Badge>}
          {clientMade && <ReviewBadge status={program.review_status} t={t} />}
        </div>
        <p className="text-sm text-muted-foreground">{t("prog.forClient", { name: clientName })}</p>
      </div>

      <div className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8">
      {/* Days by week */}
      <section className="space-y-4">
        {weeks.size === 0 && <p className="text-muted-foreground">{t("prog.noDays")}</p>}
        {[...weeks.entries()].map(([weekNo, weekDays]) => (
          <div key={weekNo} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t("prog.week", { n: weekNo })}</h2>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={t("prog.duplicateWeek")}
                  onClick={() => void duplicateWeek(coach, BASE, program.id, weekNo)}
                >
                  <Copy className="size-4" />
                </Button>
                <ConfirmButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  message={t("common.confirmDelete")}
                  onClick={() => void deleteWeek(coach, BASE, program.id, weekNo)}
                >
                  {t("common.delete")}
                </ConfirmButton>
              </div>
            </div>
            <ul className="divide-y rounded-xl border">
              {weekDays.map((d) => (
                <li key={d.id}>
                  <Link to={`/programs/${program.id}/days/${d.id}`} className="flex items-center gap-3 px-4 py-3">
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
              <li>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-primary"
                  onClick={() => void addDay(coach, BASE, program.id, weekNo)}
                >
                  <Plus className="size-4" />
                  {t("prog.addDay")}
                </button>
              </li>
            </ul>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full text-base"
          onClick={() => void addWeek(coach, BASE, program.id)}
        >
          <Plus className="size-4" />
          {t("prog.addWeek")}
        </Button>
      </section>

      {/* Program settings */}
      <section className="mt-6 space-y-4 border-t pt-6 md:mt-0 md:border-t-0 md:pt-0">
        {clientMade && (
          <form action={(fd) => reviewProgram(coach, program, fd)} className="space-y-3 rounded-xl border p-4">
            <h2 className="font-medium">{t("coach.review")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("coach.reviewWhat", { name: clientName })}
              {program.submitted_at ? ` · ${formatDate(program.submitted_at, locale)}` : ""}
            </p>
            <div className="space-y-2">
              <Label htmlFor="feedback">{t("coach.reviewFeedback")}</Label>
              <Textarea
                id="feedback"
                name="feedback"
                rows={3}
                defaultValue={program.coach_feedback ?? ""}
                placeholder={t("coach.reviewFeedbackHint")}
                className="text-base"
              />
            </div>
            {reviewed && <p className="text-sm text-primary">{t("coach.reviewed")}</p>}
            <div className="flex gap-2">
              <Button type="submit" name="decision" value="approve" className="h-12 flex-1 text-base">
                <Check className="size-4" />
                {t("coach.approve")}
              </Button>
              <Button type="submit" name="decision" value="changes" variant="secondary" className="h-12 flex-1 text-base">
                {t("coach.requestChanges")}
              </Button>
            </div>
          </form>
        )}

        <form action={(fd) => updateProgram(coach, BASE, fd)} className="space-y-3">
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
            <Label htmlFor="notes">{t("prog.notes")}</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={program.notes ?? ""} className="text-base" />
          </div>
          {saved && <p className="text-sm text-primary">{t("common.saved")}</p>}
          <Button type="submit" variant="secondary" className="h-12 w-full text-base">
            {t("common.save")}
          </Button>
        </form>

        <Button
          type="button"
          variant={program.is_active ? "outline" : "default"}
          className="h-12 w-full text-base"
          onClick={() => setProgramActive(coach, programs, program, !program.is_active)}
        >
          {program.is_active ? t("prog.deactivate") : t("prog.setActive")}
        </Button>

        <form action={(fd) => copyProgram(coach, program, fd)} className="space-y-3 rounded-xl border p-4">
          <h2 className="font-medium">{t("prog.copy")}</h2>
          <div className="space-y-2">
            <Label htmlFor="copy-client">{t("prog.copyTo")}</Label>
            <select
              id="copy-client"
              name="client_id"
              required
              defaultValue={program.client_id}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
            >
              {targets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email}
                  {p.id === coach.id ? ` (${t("nav.me")})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="copy-name">{t("prog.copyName")}</Label>
            <Input
              id="copy-name"
              name="name"
              defaultValue={`${program.name} ${t("prog.copySuffix")}`}
              maxLength={120}
              className="h-12 text-base"
            />
          </div>
          {error === "copy" && <p className="text-sm text-destructive">{t("common.error")}</p>}
          <Button type="submit" variant="secondary" className="h-12 w-full text-base">
            <Copy className="size-4" />
            {t("prog.copyDo")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("prog.copyHint")}</p>
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
      </div>
    </div>
  );
}
