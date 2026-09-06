"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCoach } from "@/lib/coach";
import { int, num, nullable, str } from "@/lib/form";
import { sendPushTo } from "@/lib/push";

function programPath(id: string) {
  return `/programs/${id}`;
}
function dayPath(programId: string, dayId: string) {
  return `/programs/${programId}/days/${dayId}`;
}

// ---------- programs ----------

export async function createProgram(formData: FormData) {
  const coach = await requireCoach();
  const client_id = str(formData, "client_id");
  const name = str(formData, "name");
  if (!client_id || !name) redirect(`/clients/${client_id}?error=1`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      client_id,
      name,
      start_date: nullable(str(formData, "start_date")),
      created_by: coach.id,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`/clients/${client_id}?error=1`);

  // First day so the coach can start straight away.
  await supabase.from("program_days").insert({ program_id: data.id, week_no: 1, day_no: 1 });

  revalidatePath(`/clients/${client_id}`);
  redirect(programPath(data.id));
}

export async function updateProgram(formData: FormData) {
  await requireCoach();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id || !name) redirect("/");

  const supabase = await createClient();
  await supabase
    .from("programs")
    .update({
      name,
      start_date: nullable(str(formData, "start_date")),
      notes: nullable(str(formData, "notes")),
    })
    .eq("id", id);

  revalidatePath(programPath(id));
  redirect(`${programPath(id)}?saved=1`);
}

export async function setProgramActive(formData: FormData) {
  const coach = await requireCoach();
  const id = str(formData, "id");
  const client_id = str(formData, "client_id");
  const active = str(formData, "active") === "1";
  if (!id || !client_id) redirect("/");

  const supabase = await createClient();
  if (active) {
    // Only one active program per client (enforced by a unique index too).
    await supabase.from("programs").update({ is_active: false }).eq("client_id", client_id);
  }
  const { data: program } = await supabase
    .from("programs")
    .update({ is_active: active })
    .eq("id", id)
    .select("name")
    .maybeSingle();

  if (active && program && client_id !== coach.id) {
    await sendPushTo([client_id], (t) => ({
      title: t("push.programActive.title", { name: program.name }),
      body: t("push.programActive.body"),
      url: "/",
    }));
  }

  revalidatePath(programPath(id));
  revalidatePath(`/clients/${client_id}`);
  redirect(programPath(id));
}

export async function deleteProgram(formData: FormData) {
  await requireCoach();
  const id = str(formData, "id");
  const client_id = str(formData, "client_id");

  const supabase = await createClient();
  await supabase.from("programs").delete().eq("id", id);

  revalidatePath(`/clients/${client_id}`);
  redirect(`/clients/${client_id}`);
}

/** Duplicate a whole program (weeks, days, exercises, targets) for another client. */
export async function copyProgram(formData: FormData) {
  const coach = await requireCoach();
  const source_id = str(formData, "id");
  const client_id = str(formData, "client_id");
  const name = str(formData, "name");
  if (!source_id || !client_id) redirect("/");

  const supabase = await createClient();
  const { data: source } = await supabase
    .from("programs")
    .select(
      "id, name, notes, program_days(week_no, day_no, title, program_exercises(exercise_id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes))",
    )
    .eq("id", source_id)
    .maybeSingle();
  if (!source) redirect("/");

  const { data: created, error } = await supabase
    .from("programs")
    .insert({
      client_id,
      name: name || source.name,
      notes: source.notes,
      is_active: false,
      created_by: coach.id,
    })
    .select("id")
    .single();
  if (error || !created) redirect(`${programPath(source_id)}?error=copy`);

  for (const d of source.program_days) {
    const { data: nd } = await supabase
      .from("program_days")
      .insert({ program_id: created.id, week_no: d.week_no, day_no: d.day_no, title: d.title })
      .select("id")
      .single();
    if (nd && d.program_exercises.length > 0) {
      await supabase
        .from("program_exercises")
        .insert(d.program_exercises.map((pe) => ({ ...pe, program_day_id: nd.id })));
    }
  }

  revalidatePath(`/clients/${client_id}`);
  redirect(programPath(created.id));
}

// ---------- weeks & days ----------

export async function addWeek(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("program_days")
    .select("week_no")
    .eq("program_id", program_id)
    .order("week_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("program_days")
    .insert({ program_id, week_no: (last?.week_no ?? 0) + 1, day_no: 1 });

  revalidatePath(programPath(program_id));
  redirect(programPath(program_id));
}

export async function addDay(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no") ?? 1;
  const supabase = await createClient();

  const { data: last } = await supabase
    .from("program_days")
    .select("day_no")
    .eq("program_id", program_id)
    .eq("week_no", week_no)
    .order("day_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data } = await supabase
    .from("program_days")
    .insert({ program_id, week_no, day_no: (last?.day_no ?? 0) + 1 })
    .select("id")
    .single();

  revalidatePath(programPath(program_id));
  redirect(data ? dayPath(program_id, data.id) : programPath(program_id));
}

export async function duplicateWeek(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no");
  if (!program_id || week_no == null) redirect("/");

  const supabase = await createClient();
  const [{ data: days }, { data: last }] = await Promise.all([
    supabase
      .from("program_days")
      .select(
        "day_no, title, program_exercises(exercise_id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes)",
      )
      .eq("program_id", program_id)
      .eq("week_no", week_no)
      .order("day_no"),
    supabase
      .from("program_days")
      .select("week_no")
      .eq("program_id", program_id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const newWeek = (last?.week_no ?? week_no) + 1;
  for (const d of days ?? []) {
    const { data: nd } = await supabase
      .from("program_days")
      .insert({ program_id, week_no: newWeek, day_no: d.day_no, title: d.title })
      .select("id")
      .single();
    if (nd && d.program_exercises.length > 0) {
      await supabase
        .from("program_exercises")
        .insert(d.program_exercises.map((pe) => ({ ...pe, program_day_id: nd.id })));
    }
  }

  revalidatePath(programPath(program_id));
  redirect(programPath(program_id));
}

export async function deleteWeek(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no");
  if (!program_id || week_no == null) redirect("/");

  const supabase = await createClient();
  await supabase.from("program_days").delete().eq("program_id", program_id).eq("week_no", week_no);

  revalidatePath(programPath(program_id));
  redirect(programPath(program_id));
}

export async function updateDay(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");

  const supabase = await createClient();
  await supabase
    .from("program_days")
    .update({ title: nullable(str(formData, "title")) })
    .eq("id", day_id);

  revalidatePath(dayPath(program_id, day_id));
  redirect(`${dayPath(program_id, day_id)}?saved=1`);
}

export async function deleteDay(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");

  const supabase = await createClient();
  await supabase.from("program_days").delete().eq("id", day_id);

  revalidatePath(programPath(program_id));
  redirect(programPath(program_id));
}

// ---------- exercises in a day ----------

function targetsFrom(formData: FormData) {
  return {
    target_sets: int(formData, "target_sets"),
    target_reps: int(formData, "target_reps"),
    target_weight: num(formData, "target_weight"),
    target_time_sec: int(formData, "target_time_sec"),
    target_rpe: num(formData, "target_rpe"),
    coach_notes: nullable(str(formData, "coach_notes")),
  };
}

export async function addProgramExercise(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const program_day_id = str(formData, "day_id");
  const exercise_id = str(formData, "exercise_id");
  if (!exercise_id) redirect(dayPath(program_id, program_day_id));

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("program_exercises")
    .select("position")
    .eq("program_day_id", program_day_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("program_exercises").insert({
    program_day_id,
    exercise_id,
    position: (last?.position ?? 0) + 1,
    ...targetsFrom(formData),
  });

  revalidatePath(dayPath(program_id, program_day_id));
  redirect(dayPath(program_id, program_day_id));
}

export async function updateProgramExercise(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");

  const supabase = await createClient();
  await supabase.from("program_exercises").update(targetsFrom(formData)).eq("id", id);

  revalidatePath(dayPath(program_id, day_id));
  redirect(`${dayPath(program_id, day_id)}?saved=${id}`);
}

export async function removeProgramExercise(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");

  const supabase = await createClient();
  await supabase.from("program_exercises").delete().eq("id", id);

  revalidatePath(dayPath(program_id, day_id));
  redirect(dayPath(program_id, day_id));
}

export async function moveProgramExercise(formData: FormData) {
  await requireCoach();
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? "up" : "down";

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("program_exercises")
    .select("id, position")
    .eq("id", id)
    .maybeSingle();

  if (current) {
    const neighbourQuery = supabase
      .from("program_exercises")
      .select("id, position")
      .eq("program_day_id", day_id)
      .neq("id", id)
      .limit(1);
    const { data: neighbour } =
      direction === "up"
        ? await neighbourQuery.lt("position", current.position).order("position", { ascending: false }).maybeSingle()
        : await neighbourQuery.gt("position", current.position).order("position", { ascending: true }).maybeSingle();

    if (neighbour) {
      await Promise.all([
        supabase.from("program_exercises").update({ position: neighbour.position }).eq("id", current.id),
        supabase.from("program_exercises").update({ position: current.position }).eq("id", neighbour.id),
      ]);
    }
  }

  revalidatePath(dayPath(program_id, day_id));
  redirect(dayPath(program_id, day_id));
}
