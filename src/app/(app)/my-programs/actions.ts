"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type Profile } from "@/lib/profile";
import { int, nullable, num, str } from "@/lib/form";
import { coachIdsExcept, sendPushTo } from "@/lib/push";
import type { Database } from "@/lib/database.types";

type ReviewStatus = Database["public"]["Enums"]["program_review"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const LIST = "/my-programs";
const programPath = (id: string) => `${LIST}/${id}`;
const dayPath = (programId: string, dayId: string) => `${LIST}/${programId}/days/${dayId}`;

type OwnProgram = {
  id: string;
  name: string;
  review_status: ReviewStatus;
  is_active: boolean;
};

type Context = { profile: Profile; supabase: SupabaseServerClient; program: OwnProgram };

/**
 * The signed-in user's own program. Programs written by a coach are edited in the
 * coach's builder, not here, so they are treated as missing.
 */
async function ownProgram(id: string): Promise<Context> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, name, review_status, is_active, client_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!program || program.client_id !== profile.id || program.created_by !== profile.id) redirect(LIST);

  return { profile, supabase, program };
}

/** Same, but refuses while a coach is reviewing the program. */
async function editableProgram(id: string): Promise<Context> {
  const ctx = await ownProgram(id);
  if (ctx.program.review_status === "pending") redirect(`${programPath(id)}?error=locked`);
  return ctx;
}

/** An approved program that changes afterwards is no longer what the coach approved. */
async function afterEdit(ctx: Context, dayId?: string) {
  if (ctx.program.review_status === "approved") {
    await ctx.supabase.from("programs").update({ review_status: "self" }).eq("id", ctx.program.id);
  }
  revalidatePath(programPath(ctx.program.id));
  if (dayId) revalidatePath(dayPath(ctx.program.id, dayId));
  if (ctx.program.is_active) {
    revalidatePath("/");
    revalidatePath("/program");
  }
}

// ---------- programs ----------

export async function createMyProgram(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const name = str(formData, "name");
  if (!name) redirect(`${LIST}?error=1`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      client_id: profile.id,
      created_by: profile.id,
      name,
      start_date: nullable(str(formData, "start_date")),
      review_status: "self",
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${LIST}?error=1`);

  // A first day so there is somewhere to add exercises.
  await supabase.from("program_days").insert({ program_id: data.id, week_no: 1, day_no: 1 });

  revalidatePath(LIST);
  redirect(programPath(data.id));
}

export async function updateMyProgram(formData: FormData) {
  const id = str(formData, "id");
  const ctx = await editableProgram(id);
  const name = str(formData, "name");
  if (!name) redirect(`${programPath(id)}?error=1`);

  await ctx.supabase
    .from("programs")
    .update({
      name,
      start_date: nullable(str(formData, "start_date")),
      notes: nullable(str(formData, "notes")),
    })
    .eq("id", id);

  await afterEdit(ctx);
  redirect(`${programPath(id)}?saved=1`);
}

export async function deleteMyProgram(formData: FormData) {
  const id = str(formData, "id");
  const ctx = await ownProgram(id);

  await ctx.supabase.from("programs").delete().eq("id", id);

  revalidatePath(LIST);
  revalidatePath("/");
  revalidatePath("/program");
  redirect(LIST);
}

/** Train by this program: it becomes the active one, replacing whatever was active. */
export async function setMyProgramActive(formData: FormData) {
  const id = str(formData, "id");
  const active = str(formData, "active") === "1";
  const ctx = await ownProgram(id);

  await ctx.supabase.rpc("set_my_active_program", { p_program_id: id, p_active: active });

  revalidatePath(LIST);
  revalidatePath(programPath(id));
  revalidatePath("/");
  revalidatePath("/program");
  redirect(`${programPath(id)}?${active ? "activated" : "deactivated"}=1`);
}

/** Send the program to the coaches and wait for their answer. */
export async function submitMyProgram(formData: FormData) {
  const id = str(formData, "id");
  const ctx = await editableProgram(id);

  const { error } = await ctx.supabase
    .from("programs")
    .update({ review_status: "pending", submitted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`${programPath(id)}?error=1`);

  if (ctx.profile.role !== "coach") {
    await sendPushTo(await coachIdsExcept(ctx.profile.id), (t) => ({
      title: t("push.programSubmitted.title", { name: ctx.profile.full_name ?? ctx.profile.email }),
      body: t("push.programSubmitted.body", { program: ctx.program.name }),
      url: `/programs/${id}`,
    }));
  }

  revalidatePath(LIST);
  revalidatePath(programPath(id));
  redirect(`${programPath(id)}?submitted=1`);
}

/** Take the program back off the coach's desk so it can be edited again. */
export async function withdrawMyProgram(formData: FormData) {
  const id = str(formData, "id");
  const ctx = await ownProgram(id);

  await ctx.supabase.from("programs").update({ review_status: "self" }).eq("id", id);

  revalidatePath(LIST);
  revalidatePath(programPath(id));
  redirect(programPath(id));
}

/** Go back to (or away from) a program the coach wrote, so the two plans can be swapped. */
export async function useCoachProgram(formData: FormData) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const id = str(formData, "id");
  const active = str(formData, "active") === "1";

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, client_id")
    .eq("id", id)
    .maybeSingle();
  if (!program || program.client_id !== profile.id) redirect(LIST);

  await supabase.rpc("set_my_active_program", { p_program_id: id, p_active: active });

  revalidatePath(LIST);
  revalidatePath("/");
  revalidatePath("/program");
  redirect(active ? "/program" : LIST);
}

// ---------- weeks & days ----------

export async function addMyWeek(formData: FormData) {
  const program_id = str(formData, "program_id");
  const ctx = await editableProgram(program_id);

  const { data: last } = await ctx.supabase
    .from("program_days")
    .select("week_no")
    .eq("program_id", program_id)
    .order("week_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  await ctx.supabase
    .from("program_days")
    .insert({ program_id, week_no: (last?.week_no ?? 0) + 1, day_no: 1 });

  await afterEdit(ctx);
  redirect(programPath(program_id));
}

export async function addMyDay(formData: FormData) {
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no") ?? 1;
  const ctx = await editableProgram(program_id);

  const { data: last } = await ctx.supabase
    .from("program_days")
    .select("day_no")
    .eq("program_id", program_id)
    .eq("week_no", week_no)
    .order("day_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data } = await ctx.supabase
    .from("program_days")
    .insert({ program_id, week_no, day_no: (last?.day_no ?? 0) + 1 })
    .select("id")
    .single();

  await afterEdit(ctx);
  redirect(data ? dayPath(program_id, data.id) : programPath(program_id));
}

export async function duplicateMyWeek(formData: FormData) {
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no");
  const ctx = await editableProgram(program_id);
  if (week_no == null) redirect(programPath(program_id));

  const [{ data: days }, { data: last }] = await Promise.all([
    ctx.supabase
      .from("program_days")
      .select(
        "day_no, title, program_exercises(exercise_id, position, target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes)",
      )
      .eq("program_id", program_id)
      .eq("week_no", week_no)
      .order("day_no"),
    ctx.supabase
      .from("program_days")
      .select("week_no")
      .eq("program_id", program_id)
      .order("week_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const newWeek = (last?.week_no ?? week_no) + 1;
  for (const d of days ?? []) {
    const { data: nd } = await ctx.supabase
      .from("program_days")
      .insert({ program_id, week_no: newWeek, day_no: d.day_no, title: d.title })
      .select("id")
      .single();
    if (nd && d.program_exercises.length > 0) {
      await ctx.supabase
        .from("program_exercises")
        .insert(d.program_exercises.map((pe) => ({ ...pe, program_day_id: nd.id })));
    }
  }

  await afterEdit(ctx);
  redirect(programPath(program_id));
}

export async function deleteMyWeek(formData: FormData) {
  const program_id = str(formData, "program_id");
  const week_no = int(formData, "week_no");
  const ctx = await editableProgram(program_id);
  if (week_no == null) redirect(programPath(program_id));

  await ctx.supabase
    .from("program_days")
    .delete()
    .eq("program_id", program_id)
    .eq("week_no", week_no);

  await afterEdit(ctx);
  redirect(programPath(program_id));
}

export async function updateMyDay(formData: FormData) {
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const ctx = await editableProgram(program_id);

  await ctx.supabase
    .from("program_days")
    .update({ title: nullable(str(formData, "title")) })
    .eq("id", day_id)
    .eq("program_id", program_id);

  await afterEdit(ctx, day_id);
  redirect(`${dayPath(program_id, day_id)}?saved=1`);
}

export async function deleteMyDay(formData: FormData) {
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const ctx = await editableProgram(program_id);

  await ctx.supabase.from("program_days").delete().eq("id", day_id).eq("program_id", program_id);

  await afterEdit(ctx);
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

/** The day has to belong to the program the caller owns. */
async function ownDay(program_id: string, day_id: string) {
  const ctx = await editableProgram(program_id);
  const { data: day } = await ctx.supabase
    .from("program_days")
    .select("id")
    .eq("id", day_id)
    .eq("program_id", program_id)
    .maybeSingle();
  if (!day) redirect(programPath(program_id));
  return ctx;
}

export async function addMyProgramExercise(formData: FormData) {
  const program_id = str(formData, "program_id");
  const program_day_id = str(formData, "day_id");
  const exercise_id = str(formData, "exercise_id");
  const ctx = await ownDay(program_id, program_day_id);
  if (!exercise_id) redirect(dayPath(program_id, program_day_id));

  const { data: last } = await ctx.supabase
    .from("program_exercises")
    .select("position")
    .eq("program_day_id", program_day_id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  await ctx.supabase.from("program_exercises").insert({
    program_day_id,
    exercise_id,
    position: (last?.position ?? 0) + 1,
    ...targetsFrom(formData),
  });

  await afterEdit(ctx, program_day_id);
  redirect(dayPath(program_id, program_day_id));
}

export async function updateMyProgramExercise(formData: FormData) {
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");
  const ctx = await ownDay(program_id, day_id);

  await ctx.supabase
    .from("program_exercises")
    .update(targetsFrom(formData))
    .eq("id", id)
    .eq("program_day_id", day_id);

  await afterEdit(ctx, day_id);
  redirect(`${dayPath(program_id, day_id)}?saved=${id}`);
}

export async function removeMyProgramExercise(formData: FormData) {
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");
  const ctx = await ownDay(program_id, day_id);

  await ctx.supabase.from("program_exercises").delete().eq("id", id).eq("program_day_id", day_id);

  await afterEdit(ctx, day_id);
  redirect(dayPath(program_id, day_id));
}

export async function moveMyProgramExercise(formData: FormData) {
  const program_id = str(formData, "program_id");
  const day_id = str(formData, "day_id");
  const id = str(formData, "id");
  const direction = str(formData, "direction") === "up" ? "up" : "down";
  const ctx = await ownDay(program_id, day_id);

  const { data: current } = await ctx.supabase
    .from("program_exercises")
    .select("id, position")
    .eq("id", id)
    .eq("program_day_id", day_id)
    .maybeSingle();

  if (current) {
    const neighbourQuery = ctx.supabase
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
        ctx.supabase.from("program_exercises").update({ position: neighbour.position }).eq("id", current.id),
        ctx.supabase.from("program_exercises").update({ position: current.position }).eq("id", neighbour.id),
      ]);
    }
  }

  await afterEdit(ctx, day_id);
  redirect(dayPath(program_id, day_id));
}
