// Security Rules tests. Run through `npm run test:rules`, which starts the
// Firestore emulator and runs this file inside it.
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc } from "firebase/firestore";

const NOW = "2026-09-25T10:00:00.000Z";
let env;

const COACH = { uid: "coach", email: "coach@example.com" };
const COACH2 = { uid: "coach2", email: "coach2@example.com" };
const CAROL = { uid: "carol", email: "carol@example.com" }; // COACH2's client
const ANNA = { uid: "anna", email: "anna@example.com" };
const BOB = { uid: "bob", email: "bob@example.com" };
const STRANGER = { uid: "stranger", email: "stranger@example.com" };
const INVITED = { uid: "invited", email: "Invited@Example.com" };

const db = (who) => env.authenticatedContext(who.uid, { email: who.email }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

function profile(role, email, extra = {}) {
  return { email, full_name: null, role, coach_id: COACH.uid, unit: "kg", locale: "uk", rest_timer_sec: 0, focus: {}, created_at: NOW, ...extra };
}

function program(extra = {}) {
  return {
    client_id: ANNA.uid, coach_id: COACH.uid, created_by: COACH.uid, name: "Plan", notes: null, start_date: null,
    is_active: false, activated_by: null, review_status: "approved", coach_feedback: null,
    submitted_at: null, reviewed_at: null, reviewed_by: null, created_at: NOW, days: [], ...extra,
  };
}

function workout(extra = {}) {
  return {
    client_id: ANNA.uid, coach_id: COACH.uid, created_by: ANNA.uid, program_id: "p1", program_day_id: "d1", day: null,
    performed_at: NOW, status: "done", client_comment: null, sets: [], notes: [], coach_seen_at: null,
    created_at: NOW, ...extra,
  };
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-mystrong",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});

after(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    await setDoc(doc(admin, "users", COACH.uid), profile("coach", COACH.email, { coach_id: COACH.uid }));
    await setDoc(doc(admin, "users", ANNA.uid), profile("client", ANNA.email));
    await setDoc(doc(admin, "users", BOB.uid), profile("client", BOB.email));
    await setDoc(doc(admin, "users", COACH2.uid), profile("coach", COACH2.email, { coach_id: COACH2.uid }));
    await setDoc(doc(admin, "users", CAROL.uid), profile("client", CAROL.email, { coach_id: COACH2.uid }));
    await setDoc(doc(admin, "workouts", "wCarol"), workout({ client_id: CAROL.uid, created_by: CAROL.uid, coach_id: COACH2.uid }));
    await setDoc(doc(admin, "invites", "carol2@example.com"), {
      email: "carol2@example.com", role: "client", full_name: null, invited_by: COACH2.uid, created_at: NOW, accepted_at: null,
    });
    await setDoc(doc(admin, "invites", "invited@example.com"), {
      email: "invited@example.com", role: "client", full_name: null, invited_by: COACH.uid, created_at: NOW, accepted_at: null,
    });
    await setDoc(doc(admin, "programs", "coachPlan"), program());
    await setDoc(doc(admin, "programs", "annaOwn"), program({ created_by: ANNA.uid, review_status: "self" }));
    await setDoc(doc(admin, "programs", "bobPlan"), program({ client_id: BOB.uid }));
    await setDoc(doc(admin, "workouts", "w1"), workout());
    await setDoc(doc(admin, "workouts", "wBob"), workout({ client_id: BOB.uid, created_by: BOB.uid }));
    await setDoc(doc(admin, "exercises", "squat"), {
      name: "Squat", youtube_url: null, description: null, muscle_group: "legs", created_by: COACH.uid, created_at: NOW,
    });
  });
});

describe("outsiders", () => {
  test("anonymous users read nothing", async () => {
    await assertFails(getDoc(doc(anon(), "exercises", "squat")));
    await assertFails(getDoc(doc(anon(), "users", ANNA.uid)));
  });

  test("an account can wait for its own profile, but not read others", async () => {
    await assertSucceeds(getDoc(doc(db(STRANGER), "users", STRANGER.uid)));
    await assertFails(getDoc(doc(db(STRANGER), "users", ANNA.uid)));
  });

  test("an account without an invite cannot create a profile or read data", async () => {
    await assertFails(setDoc(doc(db(STRANGER), "users", STRANGER.uid), profile("client", STRANGER.email)));
    await assertFails(getDoc(doc(db(STRANGER), "exercises", "squat")));
    await assertFails(getDoc(doc(db(STRANGER), "workouts", "w1")));
  });
});

describe("sign-up by invite", () => {
  test("the invited email creates its profile with the invited role", async () => {
    await assertSucceeds(setDoc(doc(db(INVITED), "users", INVITED.uid), profile("client", "invited@example.com")));
    await assertSucceeds(updateDoc(doc(db(INVITED), "invites", "invited@example.com"), { accepted_at: NOW }));
  });

  test("an invited client belongs to the coach who invited them", async () => {
    await assertFails(setDoc(doc(db(INVITED), "users", INVITED.uid), profile("client", "invited@example.com", { coach_id: COACH2.uid })));
    await assertSucceeds(setDoc(doc(db(INVITED), "users", INVITED.uid), profile("client", "invited@example.com")));
  });

  test("the invited email cannot promote itself to coach", async () => {
    await assertFails(setDoc(doc(db(INVITED), "users", INVITED.uid), profile("coach", "invited@example.com")));
  });

  test("a profile cannot be written under another uid", async () => {
    await assertFails(setDoc(doc(db(INVITED), "users", "someone-else"), profile("client", "invited@example.com")));
  });

  test("clients cannot invite; coaches can", async () => {
    const invite = { email: "new@example.com", role: "client", full_name: null, invited_by: ANNA.uid, created_at: NOW, accepted_at: null };
    await assertFails(setDoc(doc(db(ANNA), "invites", "new@example.com"), invite));
    await assertSucceeds(setDoc(doc(db(COACH), "invites", "new@example.com"), { ...invite, invited_by: COACH.uid }));
  });
});

describe("profiles", () => {
  test("a client reads and edits only their own profile, never the role", async () => {
    await assertSucceeds(getDoc(doc(db(ANNA), "users", ANNA.uid)));
    await assertFails(getDoc(doc(db(ANNA), "users", BOB.uid)));
    await assertSucceeds(updateDoc(doc(db(ANNA), "users", ANNA.uid), { unit: "lb", rest_timer_sec: 90 }));
    await assertFails(updateDoc(doc(db(ANNA), "users", ANNA.uid), { role: "coach" }));
    await assertFails(updateDoc(doc(db(ANNA), "users", BOB.uid), { full_name: "x" }));
  });

  test("a client cannot move to another coach", async () => {
    await assertFails(updateDoc(doc(db(ANNA), "users", ANNA.uid), { coach_id: COACH2.uid }));
  });

  test("the coach lists their own people and renames their clients", async () => {
    await assertSucceeds(getDocs(query(collection(db(COACH), "users"), where("coach_id", "==", COACH.uid))));
    await assertFails(getDocs(collection(db(COACH), "users")));
    await assertSucceeds(updateDoc(doc(db(COACH), "users", ANNA.uid), { full_name: "Anna" }));
    await assertFails(updateDoc(doc(db(COACH), "users", ANNA.uid), { role: "coach" }));
  });
});

describe("programs", () => {
  test("a client sees only their own programs", async () => {
    await assertSucceeds(getDocs(query(collection(db(ANNA), "programs"), where("client_id", "==", ANNA.uid))));
    await assertFails(getDoc(doc(db(ANNA), "programs", "bobPlan")));
    await assertFails(getDocs(collection(db(ANNA), "programs")));
  });

  test("a client cannot create an approved program or one for someone else", async () => {
    await assertSucceeds(setDoc(doc(db(ANNA), "programs", "n1"), program({ created_by: ANNA.uid, review_status: "self" })));
    await assertFails(setDoc(doc(db(ANNA), "programs", "n2"), program({ created_by: ANNA.uid, review_status: "approved" })));
    await assertFails(setDoc(doc(db(ANNA), "programs", "n3"), program({ client_id: BOB.uid, created_by: ANNA.uid, review_status: "self" })));
  });

  test("a client cannot approve their own program or write feedback", async () => {
    const ref = doc(db(ANNA), "programs", "annaOwn");
    await assertSucceeds(updateDoc(ref, { review_status: "pending", submitted_at: NOW }));
    await assertFails(updateDoc(ref, { review_status: "approved" }));
    await assertFails(updateDoc(ref, { coach_feedback: "great" }));
    await assertFails(updateDoc(ref, { client_id: BOB.uid }));
  });

  test("a client may only switch the coach's program on or off", async () => {
    const ref = doc(db(ANNA), "programs", "coachPlan");
    await assertSucceeds(updateDoc(ref, { is_active: true, activated_by: ANNA.uid }));
    await assertFails(updateDoc(ref, { name: "Mine now" }));
    await assertFails(updateDoc(ref, { days: [] , review_status: "self" }));
    await assertFails(deleteDoc(ref));
  });

  test("the coach approves", async () => {
    await assertSucceeds(updateDoc(doc(db(COACH), "programs", "annaOwn"), {
      review_status: "approved", coach_feedback: "ok", reviewed_at: NOW, reviewed_by: COACH.uid,
    }));
  });
});

describe("workouts", () => {
  test("a client reads and writes only their own workouts", async () => {
    await assertSucceeds(getDoc(doc(db(ANNA), "workouts", "w1")));
    await assertFails(getDoc(doc(db(ANNA), "workouts", "wBob")));
    await assertSucceeds(setDoc(doc(db(ANNA), "workouts", "w2"), workout()));
    await assertFails(setDoc(doc(db(ANNA), "workouts", "w3"), workout({ client_id: BOB.uid })));
    await assertFails(updateDoc(doc(db(ANNA), "workouts", "w1"), { client_id: BOB.uid }));
    await assertFails(updateDoc(doc(db(ANNA), "workouts", "w1"), { coach_seen_at: NOW }));
    await assertSucceeds(deleteDoc(doc(db(ANNA), "workouts", "w1")));
  });

  test("a workout may carry a sane duration", async () => {
    await assertSucceeds(setDoc(doc(db(ANNA), "workouts", "d1"), workout({ duration_sec: 3334 })));
    await assertSucceeds(setDoc(doc(db(ANNA), "workouts", "d2"), workout({ duration_sec: null })));
    await assertFails(setDoc(doc(db(ANNA), "workouts", "d3"), workout({ duration_sec: 99999 })));
    await assertFails(setDoc(doc(db(ANNA), "workouts", "d4"), workout({ duration_sec: "long" })));
  });

  test("the coach logs for a client and marks comments seen", async () => {
    await assertSucceeds(setDoc(doc(db(COACH), "workouts", "w4"), workout({ created_by: COACH.uid })));
    await assertSucceeds(updateDoc(doc(db(COACH), "workouts", "wBob"), { coach_seen_at: NOW }));
  });

  test("a stranger cannot forge a workout", async () => {
    await assertFails(setDoc(doc(db(STRANGER), "workouts", "w5"), workout({ client_id: STRANGER.uid, created_by: STRANGER.uid })));
  });
});

describe("coaches see only their own clients", () => {
  test("another coach's client is invisible", async () => {
    await assertFails(getDoc(doc(db(COACH), "users", CAROL.uid)));
    await assertFails(getDoc(doc(db(COACH), "workouts", "wCarol")));
    await assertFails(getDoc(doc(db(COACH2), "workouts", "w1")));
    await assertFails(getDoc(doc(db(COACH2), "programs", "coachPlan")));
    await assertSucceeds(getDoc(doc(db(COACH2), "workouts", "wCarol")));
  });

  test("a coach queries only by their own coach_id", async () => {
    await assertSucceeds(getDocs(query(collection(db(COACH2), "workouts"), where("coach_id", "==", COACH2.uid))));
    await assertFails(getDocs(query(collection(db(COACH2), "workouts"), where("coach_id", "==", COACH.uid))));
    await assertFails(getDocs(collection(db(COACH2), "workouts")));
  });

  test("a coach cannot write for someone else's client", async () => {
    await assertFails(setDoc(doc(db(COACH2), "workouts", "x1"), workout({ created_by: COACH2.uid, coach_id: COACH2.uid })));
    await assertFails(setDoc(doc(db(COACH2), "programs", "x2"), program({ created_by: COACH2.uid, coach_id: COACH2.uid })));
    await assertFails(updateDoc(doc(db(COACH2), "users", ANNA.uid), { full_name: "x" }));
    await assertSucceeds(setDoc(doc(db(COACH2), "workouts", "x3"), workout({ client_id: CAROL.uid, created_by: COACH2.uid, coach_id: COACH2.uid })));
  });

  test("a client cannot file a workout under another coach", async () => {
    await assertFails(setDoc(doc(db(ANNA), "workouts", "x4"), workout({ coach_id: COACH2.uid })));
    await assertFails(updateDoc(doc(db(ANNA), "workouts", "w1"), { coach_id: COACH2.uid }));
  });

  test("invites are per coach", async () => {
    await assertFails(getDoc(doc(db(COACH), "invites", "carol2@example.com")));
    await assertFails(deleteDoc(doc(db(COACH), "invites", "carol2@example.com")));
    await assertSucceeds(getDocs(query(collection(db(COACH2), "invites"), where("invited_by", "==", COACH2.uid))));
  });
});

describe("exercises", () => {
  test("clients add their own, but cannot edit the coach's", async () => {
    const mine = { name: "Plank", youtube_url: null, description: null, muscle_group: "core", created_by: ANNA.uid, created_at: NOW };
    await assertSucceeds(setDoc(doc(db(ANNA), "exercises", "plank"), mine));
    await assertFails(setDoc(doc(db(ANNA), "exercises", "forged"), { ...mine, created_by: COACH.uid }));
    await assertFails(updateDoc(doc(db(ANNA), "exercises", "squat"), { name: "x" }));
    await assertFails(deleteDoc(doc(db(ANNA), "exercises", "squat")));
    await assertSucceeds(updateDoc(doc(db(COACH), "exercises", "plank"), { name: "Plank hold" }));
  });
});

describe("export tokens", () => {
  test("only for yourself, and only long secrets", async () => {
    const token = "a".repeat(40);
    await assertSucceeds(setDoc(doc(db(ANNA), "exportTokens", token), { user_id: ANNA.uid, created_at: NOW }));
    await assertFails(setDoc(doc(db(ANNA), "exportTokens", "b".repeat(40)), { user_id: BOB.uid, created_at: NOW }));
    await assertFails(setDoc(doc(db(ANNA), "exportTokens", "short"), { user_id: ANNA.uid, created_at: NOW }));
    await assertFails(getDoc(doc(db(BOB), "exportTokens", token)));
  });
});
