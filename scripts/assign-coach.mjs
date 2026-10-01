// Puts a client under a coach: the client's profile and every program and
// workout of theirs get the coach's id, which is what the Security Rules and
// the coach's queries go by. Also gives every coach without one their own id.
//
//   node scripts/assign-coach.mjs <client email> <coach email> [--emulator] [--dry-run]
//
// Uses gcloud application-default credentials. Safe to rerun.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const [clientEmail, coachEmail] = args.filter((a) => !a.startsWith("--")).map((e) => e.toLowerCase());
if (!clientEmail || !coachEmail) {
  console.error("usage: assign-coach.mjs <client email> <coach email> [--emulator] [--dry-run]");
  process.exit(1);
}
const emulator = args.includes("--emulator");
const dryRun = args.includes("--dry-run");
if (emulator) process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";

initializeApp({ projectId: emulator ? "demo-mystrong" : "mystrong-vvr-2026" });
const db = getFirestore("default");

async function userByEmail(email) {
  const snap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snap.empty) throw new Error(`no profile for ${email}`);
  return snap.docs[0];
}

const client = await userByEmail(clientEmail);
const coach = await userByEmail(coachEmail);
if (coach.get("role") !== "coach") throw new Error(`${coachEmail} is not a coach`);
if (client.get("role") !== "client") throw new Error(`${clientEmail} is not a client`);

const writes = [];
const coaches = await db.collection("users").where("role", "==", "coach").get();
for (const c of coaches.docs) {
  if (c.get("coach_id") !== c.id) writes.push([c.ref, { coach_id: c.id }, `coach ${c.get("email")} -> self`]);
}
writes.push([client.ref, { coach_id: coach.id }, `client ${clientEmail} -> ${coachEmail}`]);
for (const name of ["programs", "workouts"]) {
  const docs = await db.collection(name).where("client_id", "==", client.id).get();
  for (const d of docs.docs) {
    if (d.get("coach_id") !== coach.id) writes.push([d.ref, { coach_id: coach.id }, `${name}/${d.id}`]);
  }
}
// A coach's own training is theirs alone.
for (const c of coaches.docs) {
  for (const name of ["programs", "workouts"]) {
    const docs = await db.collection(name).where("client_id", "==", c.id).get();
    for (const d of docs.docs) {
      if (d.get("coach_id") !== c.id) writes.push([d.ref, { coach_id: c.id }, `${name}/${d.id} (own)`]);
    }
  }
}

for (const [, , label] of writes) console.log(dryRun ? "would set" : "set", label);
if (!dryRun) {
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [ref, data] of writes.slice(i, i + 400)) batch.update(ref, data);
    await batch.commit();
  }
}
console.log(`${dryRun ? "dry run: " : ""}${writes.length} documents`);
