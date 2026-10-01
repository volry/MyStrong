// One-time: copies the fields the first migration dropped from a Supabase dump
// into Firestore — each program day's warm-up and cool-down, and each workout's
// duration. Days are matched by id inside the current `days` array, so later
// edits to the programs are kept.
//
//   node scripts/backfill-day-blocks.mjs <dump.json> [--emulator] [--dry-run]
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) throw new Error("usage: backfill-day-blocks.mjs <dump.json> [--emulator] [--dry-run]");
const emulator = args.includes("--emulator");
const dryRun = args.includes("--dry-run");
if (emulator) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

const dump = JSON.parse(readFileSync(file, "utf8"));
const blocks = new Map(dump.program_days.map((d) => [d.id, { warmup: d.warmup ?? null, cooldown: d.cooldown ?? null }]));
const durations = new Map(dump.workouts.filter((w) => w.duration_sec != null).map((w) => [w.id, w.duration_sec]));

initializeApp({ projectId: emulator ? "demo-mystrong" : "mystrong-vvr-2026" });
const db = getFirestore("default");

let days = 0;
const writes = [];
for (const doc of (await db.collection("programs").get()).docs) {
  const current = doc.get("days") ?? [];
  const next = current.map((d) => {
    const b = blocks.get(d.id) ?? { warmup: null, cooldown: null };
    if (b.warmup || b.cooldown) days += 1;
    return { ...d, warmup: d.warmup ?? b.warmup, cooldown: d.cooldown ?? b.cooldown };
  });
  writes.push([doc.ref, { days: next }]);
}
for (const doc of (await db.collection("workouts").get()).docs) {
  const duration = durations.get(doc.id);
  if (doc.get("duration_sec") === undefined) writes.push([doc.ref, { duration_sec: duration ?? null }]);
  else if (duration != null && doc.get("duration_sec") == null) writes.push([doc.ref, { duration_sec: duration }]);
}

console.log(`${dryRun ? "would update" : "updating"} ${writes.length} documents; days with warm-up/cool-down: ${days}; durations: ${durations.size}`);
if (!dryRun) {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [ref, data] of writes.slice(i, i + 400)) batch.update(ref, data);
    await batch.commit();
  }
  console.log("done");
}
