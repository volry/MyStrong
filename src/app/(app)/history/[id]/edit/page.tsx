import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import {
  WorkoutForm,
  rowsFromSets,
  type PrevSet,
  type WorkoutItem,
} from "../../../workout/[dayId]/workout-form";

export default async function EditWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { id } = await params;

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, performed_at, client_comment, client_id, program_day_id, program_day:program_days(week_no, day_no, title), set_logs(program_exercise_id, set_no, reps, weight, time_sec)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!w || w.client_id !== profile.id) notFound();

  const { data: items } = await supabase
    .from("program_exercises")
    .select(
      "id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes, exercise:exercises(id, name, youtube_url, description)",
    )
    .eq("program_day_id", w.program_day_id)
    .order("position");

  const workoutItems: WorkoutItem[] = (items ?? []).map((i) => ({
    id: i.id,
    target_sets: i.target_sets,
    target_reps: i.target_reps,
    target_weight: i.target_weight,
    target_time_sec: i.target_time_sec,
    target_rpe: i.target_rpe,
    coach_notes: i.coach_notes,
    exercise: i.exercise,
  }));

  const saved: Record<string, PrevSet[]> = {};
  for (const s of w.set_logs) {
    (saved[s.program_exercise_id] ??= []).push({
      set_no: s.set_no,
      reps: s.reps,
      weight: s.weight,
      time_sec: s.time_sec,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/history/${w.id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {formatDate(w.performed_at, locale)}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("history.edit")}</h1>
        {w.program_day && (
          <p className="text-muted-foreground">
            {t("prog.week", { n: w.program_day.week_no })} · {t("prog.day", { n: w.program_day.day_no })}
            {w.program_day.title ? ` · ${w.program_day.title}` : ""}
          </p>
        )}
      </div>

      <WorkoutForm
        mode="edit"
        locale={locale}
        unit={profile.unit}
        dayId={w.program_day_id}
        items={workoutItems}
        previous={{}}
        canLog
        workoutId={w.id}
        initialRows={rowsFromSets(workoutItems, saved, profile.unit)}
        initialComment={w.client_comment ?? ""}
        initialDate={w.performed_at}
      />
    </div>
  );
}
