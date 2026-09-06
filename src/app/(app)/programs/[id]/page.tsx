import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "@/components/confirm-button";
import {
  addDay,
  addWeek,
  copyProgram,
  deleteProgram,
  deleteWeek,
  duplicateWeek,
  setProgramActive,
  updateProgram,
} from "../actions";

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  const [{ data: program }, { data: days }, { data: people }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, start_date, notes, is_active, client_id, client:profiles!client_id(full_name, email)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("program_days")
      .select("id, week_no, day_no, title, program_exercises(count)")
      .eq("program_id", id)
      .order("week_no")
      .order("day_no"),
    supabase.from("profiles").select("id, full_name, email, role").order("full_name"),
  ]);
  if (!program) notFound();

  // Copy targets: every client, plus the coach's own account.
  const targets = (people ?? []).filter((p) => p.role === "client" || p.id === coach.id);

  const weeks = new Map<number, NonNullable<typeof days>>();
  for (const d of days ?? []) {
    const list = weeks.get(d.week_no) ?? [];
    list.push(d);
    weeks.set(d.week_no, list);
  }
  const clientName = program.client?.full_name ?? program.client?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/clients/${program.client_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          {clientName}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
          {program.is_active && <Badge>{t("client.active")}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{t("prog.forClient", { name: clientName })}</p>
      </div>

      {/* Days by week */}
      <section className="space-y-4">
        {weeks.size === 0 && <p className="text-muted-foreground">{t("prog.noDays")}</p>}
        {[...weeks.entries()].map(([weekNo, weekDays]) => (
          <div key={weekNo} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t("prog.week", { n: weekNo })}</h2>
              <div className="flex gap-1">
                <form action={duplicateWeek}>
                  <input type="hidden" name="program_id" value={program.id} />
                  <input type="hidden" name="week_no" value={weekNo} />
                  <Button type="submit" variant="ghost" size="sm" title={t("prog.duplicateWeek")}>
                    <Copy className="size-4" />
                  </Button>
                </form>
                <form action={deleteWeek}>
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
            </div>
            <ul className="divide-y rounded-xl border">
              {weekDays.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/programs/${program.id}/days/${d.id}`}
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
              <li>
                <form action={addDay}>
                  <input type="hidden" name="program_id" value={program.id} />
                  <input type="hidden" name="week_no" value={weekNo} />
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-primary"
                  >
                    <Plus className="size-4" />
                    {t("prog.addDay")}
                  </button>
                </form>
              </li>
            </ul>
          </div>
        ))}
        <form action={addWeek}>
          <input type="hidden" name="program_id" value={program.id} />
          <Button type="submit" variant="outline" className="h-12 w-full text-base">
            <Plus className="size-4" />
            {t("prog.addWeek")}
          </Button>
        </form>
      </section>

      {/* Program settings */}
      <section className="space-y-4 border-t pt-6">
        <form action={updateProgram} className="space-y-3">
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

        <form action={setProgramActive}>
          <input type="hidden" name="id" value={program.id} />
          <input type="hidden" name="client_id" value={program.client_id} />
          <input type="hidden" name="active" value={program.is_active ? "0" : "1"} />
          <Button
            type="submit"
            variant={program.is_active ? "outline" : "default"}
            className="h-12 w-full text-base"
          >
            {program.is_active ? t("prog.deactivate") : t("prog.setActive")}
          </Button>
        </form>

        <form action={copyProgram} className="space-y-3 rounded-xl border p-4">
          <input type="hidden" name="id" value={program.id} />
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

        <form action={deleteProgram}>
          <input type="hidden" name="id" value={program.id} />
          <input type="hidden" name="client_id" value={program.client_id} />
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
    </div>
  );
}
