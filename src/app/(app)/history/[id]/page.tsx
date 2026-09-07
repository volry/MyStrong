import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { formatWeight } from "@/lib/units";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteWorkout } from "../../workout/actions";

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { id } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, performed_at, status, client_comment, client_id, client:profiles!client_id(full_name, email), program_day:program_days(week_no, day_no, title, program:programs(name)), set_logs(set_no, reps, weight, time_sec, program_exercise:program_exercises(id, position, exercise:exercises(name))), workout_exercise_notes(program_exercise_id, note)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!w) notFound();

  // group sets by exercise, in program order
  type SetRow = (typeof w.set_logs)[number];
  const noteByExercise = new Map(w.workout_exercise_notes.map((n) => [n.program_exercise_id, n.note]));
  const groups = new Map<string, { name: string; position: number; note?: string; sets: SetRow[] }>();
  for (const s of w.set_logs) {
    const key = s.program_exercise?.id ?? "?";
    const g = groups.get(key) ?? {
      name: s.program_exercise?.exercise?.name ?? "?",
      position: s.program_exercise?.position ?? 0,
      note: noteByExercise.get(key),
      sets: [],
    };
    g.sets.push(s);
    groups.set(key, g);
  }
  const ordered = [...groups.values()].sort((a, b) => a.position - b.position);
  const isOwner = w.client_id === profile.id;
  const backHref = isOwner ? "/history" : `/clients/${w.client_id}`;

  return (
    <div className="space-y-4">
      <div>
        <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {isOwner ? t("history.title") : (w.client?.full_name ?? w.client?.email)}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{formatDate(w.performed_at, locale)}</h1>
          {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
        </div>
        {w.program_day && (
          <p className="text-muted-foreground">
            {w.program_day.program?.name} · {t("prog.week", { n: w.program_day.week_no })} ·{" "}
            {t("prog.day", { n: w.program_day.day_no })}
            {w.program_day.title ? ` · ${w.program_day.title}` : ""}
          </p>
        )}
      </div>

      {saved && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("history.updated")}</p>}

      {isOwner && w.status === "done" && (
        <Button render={<Link href={`/history/${w.id}/edit`} />} variant="outline" className="h-11 w-full">
          <Pencil className="size-4" />
          {t("history.edit")}
        </Button>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("history.comment")}</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">
          {w.client_comment ?? <span className="text-muted-foreground">{t("history.noComment")}</span>}
        </CardContent>
      </Card>

      {ordered.map((g) => (
        <Card key={g.name + g.position}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{g.name}</CardTitle>
            {g.note && (
              <p className="flex items-start gap-1 text-sm text-primary">
                <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
                {g.note}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm tabular-nums">
              {g.sets
                .sort((a, b) => a.set_no - b.set_no)
                .map((s) => (
                  <li key={s.set_no} className="flex gap-3">
                    <span className="w-8 text-muted-foreground">{s.set_no}.</span>
                    <span>
                      {s.weight != null ? `${formatWeight(s.weight, profile.unit)} ${profile.unit}` : "—"}
                      {s.reps != null ? ` × ${s.reps}` : ""}
                      {s.time_sec != null ? ` · ${s.time_sec}s` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {isOwner && (
        <form action={deleteWorkout} className="border-t pt-4">
          <input type="hidden" name="id" value={w.id} />
          <ConfirmButton
            type="submit"
            variant="ghost"
            className="w-full text-destructive"
            message={t("common.confirmDelete")}
          >
            {t("history.delete")}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
