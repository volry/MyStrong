import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageSquare, Play, TrendingUp } from "lucide-react";
import { getActiveProgram } from "@/lib/client-data";
import { requireCoach } from "@/lib/coach";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProgram } from "../../programs/actions";
import { renameClient } from "../../actions";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; renamed?: string; done?: string; skipped?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { error, renamed, done, skipped } = await searchParams;

  const supabase = await createClient();
  const [{ data: client }, { data: programs }, { data: workouts }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role").eq("id", id).maybeSingle(),
    supabase
      .from("programs")
      .select("id, name, start_date, is_active, created_at")
      .eq("client_id", id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("workouts")
      .select("id, performed_at, status, client_comment, program_day:program_days(week_no, day_no, title), set_logs(count)")
      .eq("client_id", id)
      .order("performed_at", { ascending: false })
      .limit(20),
  ]);
  // Clients, plus the coach's own profile (the coach can train too).
  if (!client || (client.role !== "client" && client.id !== coach.id)) notFound();
  const isSelf = client.id === coach.id;
  const active = isSelf ? null : await getActiveProgram(client.id);
  const clientName = client.full_name ?? client.email;

  // Opening this page counts as reading the client's comments.
  if (workouts && workouts.length > 0) {
    await supabase
      .from("coach_reads")
      .upsert(
        workouts.map((w) => ({ workout_id: w.id })),
        { onConflict: "workout_id", ignoreDuplicates: true },
      );
  }

  const lastWorkout = workouts?.[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{client.full_name ?? client.email}</h1>
        <p className="text-sm text-muted-foreground">{client.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("client.lastWorkout")}:{" "}
          {lastWorkout ? formatDate(lastWorkout.performed_at, locale) : t("client.never")}
        </p>
        <Button
          render={<Link href={`/clients/${client.id}/progress`} />}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          <TrendingUp className="size-4" />
          {t("coach.progress")}
        </Button>
      </div>

      {!isSelf && (
      <form action={renameClient} className="space-y-2">
        <input type="hidden" name="id" value={client.id} />
        <Label htmlFor="full_name">{t("client.rename")}</Label>
        <div className="flex gap-2">
          <Input
            id="full_name"
            name="full_name"
            defaultValue={client.full_name ?? ""}
            maxLength={80}
            className="h-12 flex-1 text-base"
          />
          <Button type="submit" variant="secondary" className="h-12">
            {t("common.save")}
          </Button>
        </div>
        {renamed && <p className="text-sm text-primary">{t("common.saved")}</p>}
        {error === "rename" && <p className="text-sm text-destructive">{t("common.error")}</p>}
      </form>
      )}

      {done && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("coach.logged", { name: clientName })}</p>}
      {skipped && <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("coach.skippedFor", { name: clientName })}</p>}

      <div className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
      <div className="space-y-6">
      {!isSelf && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("coach.logFor", { name: clientName })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!active ? (
              <p className="text-sm text-muted-foreground">{t("coach.logNoProgram")}</p>
            ) : active.nextDay ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("coach.logNext")}: {t("prog.week", { n: active.nextDay.week_no })} ·{" "}
                  {t("prog.day", { n: active.nextDay.day_no })}
                  {active.nextDay.title ? ` · ${active.nextDay.title}` : ""}
                </p>
                <Button
                  render={<Link href={`/workout/${active.nextDay.id}?for=${client.id}`} />}
                  className="h-12 w-full text-base"
                >
                  <Play className="size-4" fill="currentColor" />
                  {t("today.start")}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("today.allDone")}</p>
            )}
            {active && (
              <Link href={`/clients/${client.id}/log`} className="block text-sm text-primary underline-offset-4 hover:underline">
                {t("coach.logAnyDay")}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("client.programs")}</h2>
        {!programs || programs.length === 0 ? (
          <p className="text-muted-foreground">{t("client.noPrograms")}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {programs.map((p) => (
              <li key={p.id}>
                <Link href={`/programs/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.is_active && <Badge>{t("client.active")}</Badge>}
                    </div>
                    {p.start_date && (
                      <div className="text-sm text-muted-foreground">
                        {formatDate(p.start_date, locale)}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("client.newProgram")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProgram} className="space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <div className="space-y-2">
              <Label htmlFor="name">{t("prog.name")}</Label>
              <Input id="name" name="name" required maxLength={120} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("prog.startDate")}</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={today}
                className="h-12 text-base"
              />
            </div>
            {error === "1" && <p className="text-sm text-destructive">{t("common.error")}</p>}
            <Button type="submit" className="h-12 w-full text-base">
              {t("prog.create")}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>

      <div>
      {workouts && workouts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">{t("coach.recentWorkouts")}</h2>
          <ul className="divide-y rounded-xl border">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link href={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatDate(w.performed_at, locale)}</span>
                      {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {w.program_day
                        ? `${t("prog.week", { n: w.program_day.week_no })} · ${t("prog.day", { n: w.program_day.day_no })}${w.program_day.title ? ` · ${w.program_day.title}` : ""}`
                        : ""}
                      {w.status === "done" && ` · ${t("history.sets", { n: w.set_logs[0]?.count ?? 0 })}`}
                    </div>
                    {w.client_comment && (
                      <div className="mt-1 flex items-start gap-1 text-sm">
                        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span className="line-clamp-2">{w.client_comment}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      </div>
      </div>
    </div>
  );
}
