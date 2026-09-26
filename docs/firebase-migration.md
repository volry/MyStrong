# myStrong on Firebase

myStrong moved from Next.js + Supabase on Vercel to a single-page app on
Firebase (project `mystrong-vvr-2026`): Firebase Hosting, Firebase Auth (email +
password), Cloud Firestore (database `default`, `eur3`) and Cloud Functions
(`europe-west1`). Reasons: Firebase's free tier allows many projects, and the
app is faster and works offline because every screen reads from an on-device
copy of the data.

## Architecture

- **SPA**: Vite + React 19 + React Router (`src/main.tsx`, `src/router.tsx`,
  screens in `src/pages/`). Components, i18n and the progress / achievements
  logic are the same code as before.
- **Data** (`src/data/store.tsx`): after sign-in the app listens to everything
  the person may see — their profile, the exercise library, programs, workouts
  (a coach sees everyone's) — through Firestore's persistent cache. Screens
  derive what they show with pure selectors (`src/lib/client-data.ts`,
  `progress.ts`, `exercise-stats.ts`, `achievements.ts`).
- **Writes** (`src/data/actions/*`) are not awaited. Firestore applies them to the
  local copy at once and sends them when there is a connection, so logging a
  workout works with no signal and survives closing the app. A write the server
  refuses shows a banner (`src/data/write.ts`).
- **Offline start**: `src/sw.ts` (Workbox, via `vite-plugin-pwa`) precaches the
  whole app; it also shows Web Push notifications.
- **Security**: `firestore.rules`, tested by `scripts/firestore-rules.test.mjs`.
  Sign-up is by invitation: anyone can create an auth account, but a profile —
  and with it any data — can only be created for an email in `invites/`, with the
  invite's role. Clients cannot approve their own programs, touch the coach's
  verdict, or see other clients.
- **Cloud Functions** (`functions/`): push when a client finishes a workout,
  when a coach activates a program, when a client sends a program for review and
  when the coach answers; and `exportSets`, the CSV behind
  `/api/export/sets.csv?token=…` (Google Sheets `=IMPORTDATA`).
- **Backups**: Firestore scheduled backups (weekly, 14 weeks), no code.

## Data model

Field names keep the snake_case of the old Postgres schema; timestamps are ISO
strings. Types: `src/data/types.ts`.

| Path | Contents |
|---|---|
| `users/{uid}` | profile: email, full_name, role, unit, locale, rest_timer_sec, `focus` (exercise id → metric) |
| `users/{uid}/push/{sha256(endpoint)}` | Web Push subscription |
| `invites/{email}` | role, full_name, invited_by, accepted_at |
| `exercises/{id}` | library entry |
| `programs/{id}` | program fields + `days[]`, each with `items[]` (the old `program_days` / `program_exercises`, same ids) |
| `workouts/{id}` | client_id, program_day_id, `day` snapshot, status, client_comment, `sets[]` (with `exercise_id`), `notes[]`, coach_seen_at |
| `exportTokens/{token}` | user_id |

## Development

```bash
npm install && npm --prefix functions install
npm run dev:emulators                       # Auth + Firestore emulators (needs JDK 21+)
VITE_FIREBASE_EMULATORS=true npm run dev    # app against the emulators
npm run test:rules                          # Security Rules tests in the emulator
npm run lint && npm run build               # tsc + vite build
```

To fill the emulators with real data: `node scripts/migrate-from-supabase.mjs dump.json --emulator`
(see below for the dump), then create auth users for those uids with the Admin SDK.

## Cutover checklist

One-time, in the Firebase / Google Cloud console:

1. Upgrade `mystrong-vvr-2026` to **Blaze**; in Cloud Billing → Budgets create a
   $1 budget with e-mail alerts.
2. Authentication → Sign-in method → enable **Email/Password**.
3. `firebase functions:secrets:set VAPID_PRIVATE_KEY` (private half of the key in
   `src/lib/push-key.ts`).
4. Weekly backups:
   `gcloud firestore backups schedules create --project=mystrong-vvr-2026 --database=default --recurrence=weekly --day-of-week=SUN --retention=14w`

Moving the data:

5. Dump Supabase with `DUMP_SQL` from `scripts/migrate-from-supabase.mjs` into
   `dump.json`, then `node scripts/migrate-from-supabase.mjs dump.json` (uses
   `gcloud auth application-default` credentials). Ids are kept, so a rerun only
   refreshes documents.
6. Accounts: export `auth.users` (id, email, encrypted_password) and import with
   `firebase auth:import users.json --hash-algo=BCRYPT`, uid = Supabase id, so
   everyone keeps their password. (Alternative: import without hashes and use
   "Forgot password?".) Keep the export out of the repository and delete it after.
7. `npm run deploy` (hosting, rules, functions).
8. Check on the iPhone: sign in, log a workout in airplane mode, close the app,
   reopen, reconnect; coach sees it and gets a push.
9. Point `mystrong.vercel.app` at the new address (a redirect), tell everyone to
   add the new address to the Home Screen and turn notifications on again (Web
   Push subscriptions belong to the old origin). Existing Google Sheets links
   keep working once `/api/export/*` on Vercel redirects too; export tokens were
   copied.
10. Keep the Supabase project read-only for a month, then pause it.
