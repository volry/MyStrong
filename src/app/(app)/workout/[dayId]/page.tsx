import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";
import { makeT } from "@/i18n/dictionaries";
import { formatDate } from "@/lib/format";
import { WorkoutForm, type PrevSet, type WorkoutItem } from "./workout-form";

export default async function WorkoutPage({ params }: { params: Promise<{ dayId: string }> }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const locale = await getRequestLocale(profile.locale);
  const t = makeT(locale);
  const { dayId } = await params;

  const supabase = await createClient();
  const [{ data: day }, { data: items }, { data: lastDone }, { data: recent }] = await Promise.all([
    supabase
      .from("program_days")
      .select("id, week_no, day_no, title, program:programs!inner(id, name)")
      .eq("id", dayId)
      .maybeSingle(),
    supabase
      .from("program_exercises")
      .select(
        "id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes, exercise:exercises(id, name, youtube_url, description)",
      )
      .eq("program_day_id", dayId)
      .order("position"),
    supabase
      .from("workouts")
      .select("performed_at")
      .eq("program_day_id", dayId)
      .eq("client_id", profile.id)
      .eq("status", "done")
      .order("performed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Recent workouts feed "last time" prefill per exercise.
    supabase
      .from("workouts")
      .select(
        "id, performed_at, set_logs(set_no, reps, weight, time_sec, program_exercise:program_exercises!inner(exercise_id))",
      )
      .eq("client_id", profile.id)
      .eq("status", "done")
      .order("performed_at", { ascending: false })
      .limit(30),
  ]);
  if (!day) notFound();

  // exercise_id -> sets from the most recent workout that included that exercise
  const previous: Record<string, PrevSet[]> = {};
  for (const w of recent ?? []) {
    const byExercise = new Map<string, PrevSet[]>();
    for (const s of w.set_logs) {
      const exId = s.program_exercise.exercise_id;
      const list = byExercise.get(exId) ?? [];
      list.push({ set_no: s.set_no, reps: s.reps, weight: s.weight, time_sec: s.time_sec });
      byExercise.set(exId, list);
    }
    for (const [exId, sets] of byExercise) {
      if (!previous[exId]) previous[exId] = sets.sort((a, b) => a.set_no - b.set_no);
    }
  }

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

  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {day.program.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("prog.week", { n: day.week_no })} · {t("prog.day", { n: day.day_no })}
        </h1>
        {day.title && <p className="text-muted-foreground">{day.title}</p>}
      </div>

      {lastDone && (
        <p className="rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
          {t("workout.alreadyDone", { date: formatDate(lastDone.performed_at, locale) })}
        </p>
      )}

      <WorkoutForm
        locale={locale}
        unit={profile.unit}
        dayId={day.id}
        items={workoutItems}
        previous={previous}
        canLog
      />
    </div>
  );
}
