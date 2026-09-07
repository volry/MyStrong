import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageSquare, TrendingUp } from "lucide-react";
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
  searchParams: Promise<{ error?: string; renamed?: string }>;
}) {
  const coach = await requireCoach();
  const locale = await getRequestLocale(coach.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { error, renamed } = await searchParams;

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

      <div className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
      <div className="space-y-6">
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
