import { useEffect, useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ChevronRight, MessageSquare, Play, TrendingUp } from "lucide-react";
import { useData } from "@/data/store";
import { createProgram } from "@/data/actions/programs";
import { renameClient } from "@/data/actions/account";
import { markWorkoutsSeen } from "@/data/actions/workouts";
import { getActiveProgram } from "@/lib/client-data";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewBadge } from "@/components/review-badge";
import { ClientName } from "@/components/client-name";

export default function ClientPage() {
  const { me: coach, users, programs: allPrograms, workouts: allWorkouts, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id = "" } = useParams();
  const [search] = useSearchParams();
  const error = search.get("error");
  const renamed = search.get("renamed");
  const done = search.get("done");
  const skipped = search.get("skipped");

  const client = users.get(id);
  const programs = useMemo(
    () =>
      allPrograms
        .filter((p) => p.client_id === id)
        .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.created_at.localeCompare(a.created_at)),
    [allPrograms, id],
  );
  const workouts = useMemo(() => allWorkouts.filter((w) => w.client_id === id).slice(0, 20), [allWorkouts, id]);
  const isSelf = id === coach.id;
  const active = useMemo(
    () => (isSelf ? null : getActiveProgram(id, allPrograms, allWorkouts, exercises)),
    [isSelf, id, allPrograms, allWorkouts, exercises],
  );

  // Opening this page counts as reading the client's comments.
  const unseen = workouts.filter((w) => w.coach_seen_at == null);
  const unseenKey = unseen.map((w) => w.id).join(",");
  useEffect(() => {
    if (coach.role === "coach" && unseen.length > 0) markWorkoutsSeen(unseen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseenKey, coach.role]);

  if (coach.role !== "coach") return <Navigate to="/" replace />;
  // Clients, plus the coach's own profile (the coach can train too).
  if (!client || (client.role !== "client" && client.id !== coach.id)) return <Navigate to="/" replace />;
  const clientName = client.full_name ?? client.email;

  const lastWorkout = workouts[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        {isSelf ? (
          <h1 className="text-[2rem] leading-tight font-bold">{clientName}</h1>
        ) : (
          <ClientName
            name={client.full_name}
            email={client.email}
            action={(fd) => renameClient(client.id, fd)}
            labels={{ rename: t("client.rename"), save: t("common.save"), cancel: t("common.cancel") }}
          />
        )}
        {renamed && <p className="text-sm text-primary">{t("common.saved")}</p>}
        {error === "rename" && <p className="text-sm text-destructive">{t("common.error")}</p>}
        <p className="text-sm text-muted-foreground">{client.email}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("client.lastWorkout")}:{" "}
          {lastWorkout ? formatDate(lastWorkout.performed_at, locale) : t("client.never")}
        </p>
        <Button
          render={<Link to={`/clients/${client.id}/progress`} />}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          <TrendingUp className="size-4" />
          {t("coach.progress")}
        </Button>
      </div>

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
                  render={<Link to={`/workout/${active.nextDay.id}?for=${client.id}`} />}
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
              <Link to={`/clients/${client.id}/log`} className="block text-sm text-primary underline-offset-4 hover:underline">
                {t("coach.logAnyDay")}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">{t("client.programs")}</h2>
        {programs.length === 0 ? (
          <p className="text-muted-foreground">{t("client.noPrograms")}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {programs.map((p) => (
              <li key={p.id}>
                <Link to={`/programs/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.is_active && <Badge>{t("client.active")}</Badge>}
                      {p.created_by === client.id && <ReviewBadge status={p.review_status} t={t} />}
                    </div>
                    {p.start_date && (
                      <div className="text-sm text-muted-foreground">{formatDate(p.start_date, locale)}</div>
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
          <form action={(fd) => createProgram(coach, fd)} className="space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <div className="space-y-2">
              <Label htmlFor="name">{t("prog.name")}</Label>
              <Input id="name" name="name" required maxLength={120} className="h-12 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">{t("prog.startDate")}</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={today} className="h-12 text-base" />
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
      {workouts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">{t("coach.recentWorkouts")}</h2>
          <ul className="divide-y rounded-xl border">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link to={`/history/${w.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatDate(w.performed_at, locale)}</span>
                      {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {w.day
                        ? `${t("prog.week", { n: w.day.week_no })} · ${t("prog.day", { n: w.day.day_no })}${w.day.title ? ` · ${w.day.title}` : ""}`
                        : ""}
                      {w.status === "done" && ` · ${t("history.sets", { n: w.sets.length })}`}
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
