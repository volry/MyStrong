import { deleteDoc, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { go } from "@/lib/nav";
import { int, num, nullable, str } from "@/lib/form";
import type { Profile } from "@/lib/profile";
import type { Program, ProgramDayDoc, ProgramDoc, ProgramItem } from "../types";
import { fire, newId, now, read } from "../write";
import { track } from "@/lib/analytics";

/**
 * Program builder actions. A program is one document with its days and their
 * exercises inside, so every edit rewrites `days` in one write. The coach's
 * builder lives under /programs, a client's own under /my-programs; the same
 * operations serve both, with the client's rules layered on top.
 */

export type Base = "/programs" | "/my-programs";
const programPath = (base: Base, id: string) => `${base}/${id}`;
const dayPath = (base: Base, programId: string, dayId: string) => `${base}/${programId}/days/${dayId}`;
const uid = () => crypto.randomUUID();

function newProgram(
  fields: Partial<ProgramDoc> & Pick<ProgramDoc, "client_id" | "coach_id" | "created_by" | "name">,
): ProgramDoc {
  return {
    notes: null,
    start_date: null,
    is_active: false,
    activated_by: null,
    review_status: "approved",
    coach_feedback: null,
    submitted_at: null,
    reviewed_at: null,
    reviewed_by: null,
    created_at: now(),
    days: [{ id: uid(), week_no: 1, day_no: 1, title: null, items: [] }],
    ...fields,
  };
}

/**
 * Apply a change to the latest local copy of a program. A client's program that
 * the coach approved stops being approved once it changes, and one waiting for
 * review cannot change at all.
 */
async function edit(
  profile: Profile,
  programId: string,
  change: (p: ProgramDoc) => Partial<ProgramDoc> | null,
): Promise<ProgramDoc | null> {
  const program = await read<ProgramDoc>(doc(db, "programs", programId));
  if (!program) return null;
  const ownEdit = profile.role !== "coach";
  if (ownEdit && program.review_status === "pending") {
    go(`/my-programs/${programId}?error=locked`, { replace: true });
    return null;
  }
  const patch = change(program);
  if (!patch) return program;
  if (ownEdit && program.review_status === "approved" && !patch.review_status) patch.review_status = "self";
  fire(updateDoc(doc(db, "programs", programId), patch));
  return { ...program, ...patch };
}

function mapDay(days: ProgramDayDoc[], dayId: string, fn: (d: ProgramDayDoc) => ProgramDayDoc) {
  return days.map((d) => (d.id === dayId ? fn(d) : d));
}

// ---------- programs ----------

/** Coach: a new program for a client (or for the coach herself). */
export function createProgram(profile: Profile, formData: FormData) {
  const client_id = str(formData, "client_id");
  const name = str(formData, "name");
  if (!client_id || !name) return go(`/clients/${client_id}?error=1`);
  const id = newId("programs");
  fire(
    setDoc(
      doc(db, "programs", id),
      newProgram({
        client_id,
        coach_id: profile.id,
        created_by: profile.id,
        name,
        start_date: nullable(str(formData, "start_date")),
      }),
    ),
  );
  track("program_create", { by: "coach" });
  go(`/programs/${id}`);
}

/** Client: a program of their own, trained by alone until sent for review. */
export function createMyProgram(profile: Profile, formData: FormData) {
  const name = str(formData, "name");
  if (!name) return go("/my-programs?error=1");
  const id = newId("programs");
  fire(
    setDoc(
      doc(db, "programs", id),
      newProgram({
        client_id: profile.id,
        coach_id: profile.coach_id ?? "",
        created_by: profile.id,
        name,
        start_date: nullable(str(formData, "start_date")),
        review_status: "self",
      }),
    ),
  );
  track("program_create", { by: "client" });
  go(`/my-programs/${id}`);
}

export async function updateProgram(profile: Profile, base: Base, formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return go(`${programPath(base, id)}?error=1`);
  const done = await edit(profile, id, () => ({
    name,
    start_date: nullable(str(formData, "start_date")),
    notes: nullable(str(formData, "notes")),
  }));
  if (done) go(`${programPath(base, id)}?saved=1`, { replace: true });
}

export function deleteProgram(base: Base, program: Program) {
  fire(deleteDoc(doc(db, "programs", program.id)));
  go(base === "/programs" ? `/clients/${program.client_id}` : "/my-programs", { replace: true });
}

/**
 * Make a program the client's active one (or switch it off). Only one program
 * is active per client, so the others are switched off in the same batch.
 */
export function setProgramActive(profile: Profile, programs: Program[], program: Program, active: boolean) {
  const batch = writeBatch(db);
  if (active) {
    for (const p of programs) {
      if (p.client_id === program.client_id && p.is_active && p.id !== program.id) {
        batch.update(doc(db, "programs", p.id), { is_active: false, activated_by: profile.id });
      }
    }
  }
  batch.update(doc(db, "programs", program.id), { is_active: active, activated_by: profile.id });
  fire(batch.commit());
}

/** Duplicate a whole program (weeks, days, exercises, targets) for another client. */
export function copyProgram(profile: Profile, source: Program, formData: FormData) {
  const client_id = str(formData, "client_id");
  if (!client_id) return;
  const id = newId("programs");
  fire(
    setDoc(
      doc(db, "programs", id),
      newProgram({
        client_id,
        coach_id: profile.id,
        created_by: profile.id,
        name: str(formData, "name") || source.name,
        notes: source.notes,
        days: source.days.map((d) => ({ ...d, id: uid(), items: d.items.map((i) => ({ ...i, id: uid() })) })),
      }),
    ),
  );
  go(`/programs/${id}`);
}

/** Coach's answer to a program a client wrote: approve it, or ask for changes. */
export function reviewProgram(profile: Profile, program: Program, formData: FormData) {
  const approved = str(formData, "decision") === "approve";
  fire(
    updateDoc(doc(db, "programs", program.id), {
      review_status: approved ? "approved" : "changes_requested",
      coach_feedback: nullable(str(formData, "feedback").slice(0, 2000)),
      reviewed_at: now(),
      reviewed_by: profile.id,
    }),
  );
  go(`/programs/${program.id}?reviewed=1`, { replace: true });
}

/** Client: send the program to the coaches and wait for their answer. */
export async function submitMyProgram(profile: Profile, id: string) {
  const done = await edit(profile, id, () => ({ review_status: "pending", submitted_at: now() }));
  if (done) {
    track("program_submit");
    go(`/my-programs/${id}?submitted=1`, { replace: true });
  }
}

/** Client: take the program back off the coach's desk so it can be edited again. */
export function withdrawMyProgram(id: string) {
  fire(updateDoc(doc(db, "programs", id), { review_status: "self" }));
}

// ---------- weeks & days ----------

export async function addWeek(profile: Profile, base: Base, programId: string) {
  await edit(profile, programId, (p) => {
    const week = p.days.reduce((m, d) => Math.max(m, d.week_no), 0) + 1;
    return { days: [...p.days, { id: uid(), week_no: week, day_no: 1, title: null, items: [] }] };
  });
  go(programPath(base, programId), { replace: true });
}

export async function addDay(profile: Profile, base: Base, programId: string, weekNo: number) {
  const dayId = uid();
  const done = await edit(profile, programId, (p) => {
    const day = p.days.filter((d) => d.week_no === weekNo).reduce((m, d) => Math.max(m, d.day_no), 0) + 1;
    return { days: [...p.days, { id: dayId, week_no: weekNo, day_no: day, title: null, items: [] }] };
  });
  if (done) go(dayPath(base, programId, dayId));
}

export async function duplicateWeek(profile: Profile, base: Base, programId: string, weekNo: number) {
  await edit(profile, programId, (p) => {
    const newWeek = p.days.reduce((m, d) => Math.max(m, d.week_no), weekNo) + 1;
    const copies = p.days
      .filter((d) => d.week_no === weekNo)
      .map((d) => ({ ...d, id: uid(), week_no: newWeek, items: d.items.map((i) => ({ ...i, id: uid() })) }));
    return { days: [...p.days, ...copies] };
  });
  go(programPath(base, programId), { replace: true });
}

export async function deleteWeek(profile: Profile, base: Base, programId: string, weekNo: number) {
  await edit(profile, programId, (p) => ({ days: p.days.filter((d) => d.week_no !== weekNo) }));
  go(programPath(base, programId), { replace: true });
}

export async function updateDay(profile: Profile, base: Base, programId: string, dayId: string, formData: FormData) {
  const title = nullable(str(formData, "title"));
  const done = await edit(profile, programId, (p) => ({ days: mapDay(p.days, dayId, (d) => ({ ...d, title })) }));
  if (done) go(`${dayPath(base, programId, dayId)}?saved=1`, { replace: true });
}

export async function deleteDay(profile: Profile, base: Base, programId: string, dayId: string) {
  await edit(profile, programId, (p) => ({ days: p.days.filter((d) => d.id !== dayId) }));
  go(programPath(base, programId), { replace: true });
}

// ---------- exercises in a day ----------

function targetsFrom(formData: FormData): Omit<ProgramItem, "id" | "exercise_id"> {
  return {
    target_sets: int(formData, "target_sets"),
    target_reps: int(formData, "target_reps"),
    target_weight: num(formData, "target_weight"),
    target_time_sec: int(formData, "target_time_sec"),
    target_rpe: num(formData, "target_rpe"),
    coach_notes: nullable(str(formData, "coach_notes")),
  };
}

export async function addProgramExercise(
  profile: Profile,
  base: Base,
  programId: string,
  dayId: string,
  formData: FormData,
) {
  const exercise_id = str(formData, "exercise_id");
  if (exercise_id) {
    const item: ProgramItem = { id: uid(), exercise_id, ...targetsFrom(formData) };
    await edit(profile, programId, (p) => ({
      days: mapDay(p.days, dayId, (d) => ({ ...d, items: [...d.items, item] })),
    }));
  }
  go(dayPath(base, programId, dayId), { replace: true });
}

export async function updateProgramExercise(
  profile: Profile,
  base: Base,
  programId: string,
  dayId: string,
  formData: FormData,
) {
  const id = str(formData, "id");
  const targets = targetsFrom(formData);
  await edit(profile, programId, (p) => ({
    days: mapDay(p.days, dayId, (d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...targets } : i)) })),
  }));
  go(`${dayPath(base, programId, dayId)}?saved=${id}`, { replace: true });
}

export async function removeProgramExercise(profile: Profile, base: Base, programId: string, dayId: string, id: string) {
  await edit(profile, programId, (p) => ({
    days: mapDay(p.days, dayId, (d) => ({ ...d, items: d.items.filter((i) => i.id !== id) })),
  }));
  go(dayPath(base, programId, dayId), { replace: true });
}

export async function moveProgramExercise(
  profile: Profile,
  base: Base,
  programId: string,
  dayId: string,
  id: string,
  direction: "up" | "down",
) {
  await edit(profile, programId, (p) => ({
    days: mapDay(p.days, dayId, (d) => {
      const items = [...d.items];
      const from = items.findIndex((i) => i.id === id);
      const to = direction === "up" ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= items.length) return d;
      [items[from], items[to]] = [items[to], items[from]];
      return { ...d, items };
    }),
  }));
  go(dayPath(base, programId, dayId), { replace: true });
}

