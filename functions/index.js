// myStrong Cloud Functions: Web Push notifications and the CSV export link.
// Everything else runs in the browser against Firestore under Security Rules.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import webpush from "web-push";
import { buildCsv } from "./csv.js";
import { text } from "./messages.js";

initializeApp();
const db = getFirestore("default");

const REGION = "europe-west1";
const DATABASE = "default";
setGlobalOptions({ region: REGION, maxInstances: 5 });

const VAPID_PRIVATE_KEY = defineSecret("VAPID_PRIVATE_KEY");
const VAPID_PUBLIC_KEY =
  "BK0q4i5AC1DXXWZesJ1TpU3tgBkK6b1Kx9Ifj4ikeOjhkdHcXmFeAoTPEwu3Q_0Axa3jeTZrjlN-LCR0BpLrIbs";

// ---------- push ----------

/** Send to every device of the given users; text is built in each recipient's language. Never throws. */
async function sendPush(userIds, build) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  webpush.setVapidDetails("mailto:v.v.ryzhuk@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.value());
  await Promise.all(
    ids.map(async (uid) => {
      const [profile, subs] = await Promise.all([
        db.doc(`users/${uid}`).get(),
        db.collection(`users/${uid}/push`).get(),
      ]);
      const locale = profile.get("locale") === "uk" ? "uk" : "en";
      const payload = JSON.stringify(build(text(locale), locale));
      await Promise.all(
        subs.docs.map(async (sub) => {
          const { endpoint, p256dh, auth } = sub.data();
          try {
            await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload, { TTL: 60 * 60 * 12 });
          } catch (err) {
            // The browser dropped the subscription: forget it.
            if (err?.statusCode === 404 || err?.statusCode === 410) await sub.ref.delete();
            else console.warn("push failed", err?.statusCode ?? err);
          }
        }),
      );
    }),
  );
}

/** The client's own coach, never the client themself (a coach's own training). */
function coachOf(doc) {
  return doc.coach_id && doc.coach_id !== doc.client_id ? [doc.coach_id] : [];
}

async function nameOf(uid) {
  const p = await db.doc(`users/${uid}`).get();
  return p.get("full_name") || p.get("email") || "";
}

/** A client finished a workout: tell the coaches. Nothing when a coach logged it. */
export const workoutCreated = onDocumentCreated(
  { document: "workouts/{id}", database: DATABASE, secrets: [VAPID_PRIVATE_KEY] },
  async (event) => {
    const w = event.data?.data();
    if (!w || w.status !== "done" || w.created_by !== w.client_id) return;
    const author = await db.doc(`users/${w.created_by}`).get();
    if (author.get("role") === "coach") return;

    const name = author.get("full_name") || author.get("email") || "";
    const comment = (w.client_comment ?? "").trim();
    await sendPush(coachOf(w), (t) => ({
      title: t.workoutDone(name),
      body:
        (w.day ? [t.week(w.day.week_no), t.day(w.day.day_no), w.day.title].filter(Boolean).join(" · ") : "") +
        (comment ? `\n“${comment.slice(0, 120)}”` : ""),
      url: `/history/${event.params.id}`,
    }));
  },
);

/** Program changes the other side should hear about. */
export const programUpdated = onDocumentUpdated(
  { document: "programs/{id}", database: DATABASE, secrets: [VAPID_PRIVATE_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const id = event.params.id;

    // The coach switched a program on for a client (not the client's own switch).
    if (!before.is_active && after.is_active && after.activated_by && after.activated_by !== after.client_id) {
      await sendPush([after.client_id], (t) => ({
        title: t.programActive(after.name),
        body: t.programActiveBody,
        url: "/",
      }));
    }

    // A client sent their program for review.
    if (before.review_status !== "pending" && after.review_status === "pending") {
      const name = await nameOf(after.client_id);
      await sendPush(coachOf(after), (t) => ({
        title: t.programSubmitted(name),
        body: t.programSubmittedBody(after.name),
        url: `/programs/${id}`,
      }));
    }

    // The coach answered.
    if (
      after.reviewed_at &&
      after.reviewed_at !== before.reviewed_at &&
      (after.review_status === "approved" || after.review_status === "changes_requested") &&
      after.reviewed_by !== after.client_id
    ) {
      await sendPush([after.client_id], (t) => ({
        title: after.review_status === "approved" ? t.programApproved : t.programChanges,
        body: after.name,
        url: `/my-programs/${id}`,
      }));
    }
  },
);

// ---------- CSV export (Google Sheets =IMPORTDATA and the download button) ----------

export const exportSets = onRequest({ cors: false, memory: "256MiB" }, async (req, res) => {
  const token = String(req.query.token ?? "");
  if (token.length < 32) {
    res.status(401).send("Missing or invalid token");
    return;
  }
  const tokenDoc = await db.doc(`exportTokens/${token}`).get();
  const userId = tokenDoc.get("user_id");
  if (!tokenDoc.exists || !userId) {
    res.status(401).send("Missing or invalid token");
    return;
  }
  const who = await db.doc(`users/${userId}`).get();
  const coach = who.get("role") === "coach";

  // A coach exports their own clients (and their own training); a client, themself.
  const scope = coach ? ["coach_id", userId] : ["client_id", userId];
  const [workouts, programs, exercises, users] = await Promise.all([
    db.collection("workouts").where(scope[0], "==", scope[1]).get(),
    db.collection("programs").where(scope[0], "==", scope[1]).get(),
    db.collection("exercises").get(),
    coach ? db.collection("users").where("coach_id", "==", userId).get() : Promise.resolve({ docs: [who] }),
  ]);

  const body = buildCsv({
    workouts: workouts.docs.map((d) => ({ id: d.id, ...d.data() })),
    programs: programs.docs.map((d) => ({ id: d.id, ...d.data() })),
    exercises: new Map(exercises.docs.map((d) => [d.id, d.data()])),
    users: new Map(users.docs.map((d) => [d.id, d.data()])),
  });

  const download = req.query.download === "1";
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `${download ? "attachment" : "inline"}; filename="mystrong-sets.csv"`);
  res.set("Cache-Control", "no-store");
  res.status(200).send(body);
});
