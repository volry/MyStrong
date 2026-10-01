import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { ChevronLeft, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/data/store";
import { deleteWorkout } from "@/data/actions/workouts";
import type { LoggedSetDoc } from "@/data/types";
import { useLocale } from "@/i18n/client";
import { makeT } from "@/i18n/dictionaries";
import { findDay } from "@/lib/client-data";
import { formatDate, formatDuration } from "@/lib/format";
import { formatWeight } from "@/lib/units";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/confirm-button";

export default function WorkoutDetailPage() {
  const { me: profile, users, workouts, programs, exercises } = useData();
  const locale = useLocale();
  const t = makeT(locale);
  const { id } = useParams();
  const [search] = useSearchParams();
  const saved = search.get("saved");

  const w = workouts.find((x) => x.id === id);
  if (!w) return <Navigate to="/history" replace />;

  const found = findDay(programs, w.program_day_id);
  const programName = programs.find((p) => p.id === w.program_id)?.name ?? found?.program.name;
  const position = new Map(found?.day.items.map((i, index) => [i.id, index]) ?? []);

  // group sets by exercise, in program order
  const noteByExercise = new Map(w.notes.map((n) => [n.program_exercise_id, n.note]));
  const groups = new Map<string, { name: string; position: number; note?: string; sets: LoggedSetDoc[] }>();
  for (const s of w.sets) {
    const key = s.program_exercise_id;
    const exerciseId = s.exercise_id ?? found?.day.items.find((i) => i.id === key)?.exercise_id;
    const g = groups.get(key) ?? {
      name: (exerciseId && exercises.get(exerciseId)?.name) || "?",
      // Exercises since removed from the day keep the order they were logged in.
      position: position.get(key) ?? 1000 + groups.size,
      note: noteByExercise.get(key),
      sets: [],
    };
    g.sets.push(s);
    groups.set(key, g);
  }
  const ordered = [...groups.values()].sort((a, b) => a.position - b.position);
  const isOwner = w.client_id === profile.id;
  const canEdit = isOwner || profile.role === "coach";
  const backHref = isOwner ? "/history" : `/clients/${w.client_id}`;
  const client = users.get(w.client_id);

  return (
    <div className="space-y-4">
      <div>
        <Link to={backHref} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {isOwner ? t("history.title") : (client?.full_name ?? client?.email)}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-[2rem] leading-tight font-bold">{formatDate(w.performed_at, locale)}</h1>
          {w.status === "skipped" && <Badge variant="secondary">{t("history.skipped")}</Badge>}
          {formatDuration(w.duration_sec, t) && <Badge variant="outline">{formatDuration(w.duration_sec, t)}</Badge>}
        </div>
        {w.day && (
          <p className="text-muted-foreground">
            {programName} · {t("prog.week", { n: w.day.week_no })} ·{" "}
            {t("prog.day", { n: w.day.day_no })}
            {w.day.title ? ` · ${w.day.title}` : ""}
          </p>
        )}
      </div>

      {saved && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">{t("history.updated")}</p>}

      {canEdit && w.status === "done" && (
        <Button render={<Link to={`/history/${w.id}/edit`} />} variant="outline" className="h-11 w-full">
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
              {[...g.sets]
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

      {canEdit && (
        <div className="border-t pt-4">
          <ConfirmButton
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            message={t("common.confirmDelete")}
            onClick={() => deleteWorkout(profile, w)}
          >
            {t("history.delete")}
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
