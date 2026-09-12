# myStrong — plan

## Decisions (agreed 2026-09-06)

- Platform: PWA, installed to iPhone home screen. Also works on Android/desktop.
- Users: one coach (wife), clients (husband now, her clients later). No other coaches.
- Roles: `coach` and `client`. The developer account can hold both roles and switch between them.
- Backend: Supabase (Postgres, Auth, Row Level Security). No file storage needed.
- Videos: YouTube links only, embedded in the app.
- Comments: one-way note from client on a result; coach reads them and edits the program.
- Charts: progress metrics for both roles.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- `@supabase/ssr` for auth and data access; RLS enforces who sees what
- `next-pwa` or Serwist for manifest + service worker (installable, app-like on iOS)
- Recharts for charts
- Hosting: Vercel (free tier) — HTTPS is required for PWA install on iOS
- Auth: email + password (see decisions below; magic link dropped). Coach invites a client by email.

## Data model

```
profiles          id (= auth.users.id), full_name, role ('coach'|'client'), unit ('kg'|'lb'), created_at
exercises         id, name, youtube_url, description, muscle_group, created_by
programs          id, client_id, name, start_date, is_active, notes, created_at
program_days      id, program_id, week_no, day_no, title, order
program_exercises id, program_day_id, exercise_id, order,
                  target_sets, target_reps, target_weight, target_time_sec, target_rpe, coach_notes
workouts          id, program_day_id, client_id, performed_at, client_comment, status ('done'|'skipped')
set_logs          id, workout_id, program_exercise_id, set_no, reps, weight, time_sec, rpe
```

Notes:
- A `workout` is one performance of a `program_day` by a client. Repeating a day next week creates a new workout.
- `set_logs` are per set, so charts can compute best set, total volume, estimated 1RM.
- Weight stored in kg; displayed per `profiles.unit`.
- Developer account: `role = 'coach'` plus a `dev_client_id` pointer, or simply two accounts (coach@, client@). Decision: two accounts is simplest and mirrors real usage; a role switcher is a later nicety.

## RLS rules

- coach: full read/write on everything.
- client: read own `programs` (via `client_id`) and their days/exercises, read all `exercises`; read/write own `workouts` and `set_logs`; read/update own `profiles`.
- `role` is copied into the JWT via a Postgres function so policies don't need joins.

## Screens

### Client
1. **Today** — next unfinished day of the active program. Big "Start workout" button. Shows week/day and exercise count.
2. **Workout** — exercise list. Each exercise card: name, target (e.g. 4 × 8 @ 60 kg), YouTube embed collapsed behind a play button, set rows prefilled from last time, tap to edit reps/weight, check to mark done. Bottom: comment field + "Finish".
3. **Program** — whole program by week/day, done days ticked. Tap any day to view or log it.
4. **Progress** — per exercise: chart of best set weight and total volume over time, estimated 1RM. Streak / workouts-this-month tiles.
5. **History** — list of completed workouts with comment preview.

### Coach
1. **Clients** — list with last workout date, unread comments badge.
2. **Client detail** — active program, recent workouts with comments, progress charts (same component as client's).
3. **Program builder** — create/edit program: add weeks, days, exercises with targets and notes. Duplicate week. Assign to client, set active.
4. **Exercise library** — name, YouTube link, description, muscle group. Preview embed.
5. **Invite client** — enter email, sends magic link.

### Shared
- Bottom tab bar (iOS style), safe-area insets, 100dvh layouts.
- Settings: name, unit, sign out. Coach sees "view as client" later.

## Milestones

1. Scaffold Next.js + Supabase + PWA manifest; magic-link login; profile with role. Deploy to Vercel. Install on iPhone.
2. Exercise library + program builder (coach).
3. Client Today/Workout/Program with set logging and comments.
4. Coach client detail with comments and history.
5. Progress charts for both roles.
6. Polish: offline caching of the current program, push notifications (optional).

## Open questions

- Supabase project: create new one? I need the project URL and anon key (env vars) — or you create it and paste them into `.env.local`.
- Vercel account for hosting?
- App language: English or Russian UI? Both via i18n?
- Default unit kg?

## Decisions added 2026-09-06 (later)

- UI languages: English and Ukrainian (`profiles.locale`, `en` | `uk`). Default unit: kg.
- Login: email + password (changed 2026-09-06). Supabase built-in email cannot send one-time codes (template not editable without custom SMTP, and only ~2 emails/hour), and a magic link opened from Mail signs in Safari rather than the installed iOS app. Password reset goes by email link to `/auth/confirm?next=/reset-password`.
- Sign-up is invitation-only: the coach adds an email under "Invite a client"; the client taps "Create an account" with that email; the `handle_new_user` trigger rejects any other new email. The very first account ever created becomes the coach.
- Role check in RLS uses `private.is_coach()` (SECURITY DEFINER helper) instead of a JWT claim hook — no dashboard step needed and always fresh.
- Next.js 16: request middleware lives in `src/proxy.ts` (the `middleware.ts` convention is deprecated).

## Milestone 1 status

Done: scaffold (Next 16, Tailwind 4, shadcn), Supabase clients, proxy session refresh, login with email + password (sign in / create account / forgot password), `profiles` + `invites` tables with RLS, coach home (clients + invites), client home placeholder, settings (name/unit/language/sign out), PWA manifest + icons (placeholder solid teal), Vercel CLI + skills installed.

Deployed: https://mystrong.vercel.app (Vercel project `mystrong`, team `vova11-7159`, production). Remaining (need the owner, Supabase dashboard): set Supabase Auth Site URL / redirect URL to the Vercel domain; turn off "Confirm email" under Authentication → Sign In / Providers → Email (sign-up is already invite-only).

## Milestone 2 status (2026-09-06)

Done: full schema (`exercises`, `programs`, `program_days`, `program_exercises`, `workouts`, `set_logs`) with RLS; generated types in `src/lib/database.types.ts`; coach screens: exercise library (`/exercises`, search, add/edit/delete, YouTube preview), client detail (`/clients/[id]`, programs list, new program), program editor (`/programs/[id]`: weeks/days, add/duplicate/delete week, add day, settings, activate, delete), day editor (`/programs/[id]/days/[dayId]`: add exercises with targets, edit targets, reorder, remove). Deployed.

Next: Milestone 3 — client Today / Workout / Program screens with set logging and comments.

## Milestone 3 status (2026-09-06)

Done: client Today (`/`: next unfinished day of the active program, Start button, coach notes, last workout, "all done" state), Workout (`/workout/[dayId]`: per-exercise set rows prefilled from the last time that exercise was logged, else from targets; tick per set; add set; tick all; collapsible YouTube video; coach notes; comment; Finish; Skip day; draft kept in localStorage), Program (`/program`: weeks/days with done ticks, next day highlighted, tap to log any day), History (`/history`, `/history/[id]`: sets per exercise, comment, delete). Coach client page lists recent workouts with comments and opens the same detail view. Weight shown in the profile unit, stored in kg. Deployed.

Next: Milestone 4/5 — coach unread-comment badge, progress charts (best set, volume, est. 1RM) for both roles.

## Milestones 4 & 5 status (2026-09-06)

Done: `coach_reads` table; coach Clients list shows last workout date and a "{n} new" badge for workouts with unread comments, cleared when the coach opens the client page. Progress: `src/lib/progress.ts` aggregates per exercise per workout (best set, est. 1RM by Epley for ≤12 reps, volume = Σ weight×reps) plus tiles (this month, week streak, total). `ProgressView` (Recharts, single series #0d9488 validated with the dataviz checker) at `/progress` for the client and `/clients/[id]/progress` for the coach. Chart not visually verified: Chrome extension was not connected; server render checked only.

Next: Milestone 6 polish — offline caching of the current program, coach "view as client", real app icon, push notifications (optional).

## Milestone 6 status (2026-09-06)

Done: coach can rename clients (`profiles: coach update clients` policy; column grants still limit to full_name/unit/locale). Service worker `public/sw.js` (hand-written, no library): `/offline` fallback page, network-first for navigations with last-seen copy as fallback, cache-first for `/_next/static` and icons; page cache cleared on the login screen. Real app icon (teal + white dumbbell, `scripts/gen-icons.mjs`). Coach "Me" tab (`/me`): the coach can have programs of her own (`/clients/<coach id>` manages them) and log workouts like a client; client pages no longer redirect coaches. Push notifications: skipped (optional, needs VAPID + extra infra).

Support note: iOS home-screen web apps use Safari's cellular-data switch (Settings → Cellular → Safari). Owner hit this on 2026-09-06.

Edit a logged workout (2026-09-06): `/history/[id]/edit` reuses `WorkoutForm` in edit mode (saved sets prefilled and ticked, comment, date); `updateWorkout` replaces the sets. Owner only.

Copy program (2026-09-06): "Copy program" section on `/programs/[id]` — target client (or the coach), new name; `copyProgram` duplicates days + exercises as an inactive program and opens it.

Remaining ideas: push notifications; charts visually checked on a phone.

## Push notifications (2026-09-06)

Web Push with VAPID (`web-push` on the server). Table `push_subscriptions` (own rows writable; readable by owner, by the coach, and everyone can read the coach's rows so a client's session can notify the coach — endpoints are useless without the server-only private key). `src/lib/push.ts` `sendPushTo(userIds, build)` localizes per recipient; expired endpoints deleted directly (delete policy mirrors the read policy; no SECURITY DEFINER function). Toggle in Settings (`push-toggle.tsx`) handles iOS (needs Home Screen install), denied, on/off. Service worker v2 shows notifications and focuses the app on tap.

Triggers: client finishes a workout → every coach gets "{name} finished a workout" with day + comment preview, opens the workout. Coach activates a program → that client gets "New program: {name}", opens Today.

Env (Vercel, all environments): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (sensitive), `VAPID_SUBJECT`. For local dev add the same to `.env.local` (`vercel env pull`).

## Export to Google Sheets (2026-09-06)

Settings → Export: "Download CSV" and a live link for Google Sheets (`=IMPORTDATA("https://mystrong.vercel.app/api/export/sets.csv?token=…")`). One row per set. Per-user secret in `export_tokens` (auto-created on first Settings visit; "Make a new link" rotates it). `public.export_sets(p_token)` is SECURITY DEFINER callable by anon on purpose (Sheets has no session); it returns nothing for unknown tokens; coach token = all clients, client token = own. Route: `src/app/api/export/sets.csv/route.ts` (anon supabase-js client → RPC → CSV with BOM). `/api/export` is public in the proxy. No Google OAuth integration (would need a Google Cloud project).

## Feedback round 1 (2026-09-07)

- Per-exercise client note in the workout (`workout_exercise_notes`), collapsed behind a small "Note for coach" toggle; shown in history detail and CSV export (`exercise_note`).
- "Last" column in the set grid shows what was done last time (weight×reps or seconds).
- Speed: Supabase project is in AWS eu-central-1 (Frankfurt); Vercel functions ran in iad1. `vercel.json` pins functions to `fra1`. Added `(app)/loading.tsx` skeleton so tab taps respond instantly; `getActiveProgram` now one round trip.

## Desktop view for the coach (2026-09-07)

md+ breakpoint: left sidebar (`side-nav.tsx`) replaces the bottom tab bar; coach pages widen to max-w-6xl (client pages max-w-2xl). Clients page and client detail are two columns. Program editor: days left, settings right. Day editor: table of exercises with inline target inputs (each row is its own form via the `form` attribute; up/down/remove use `formAction`), plus a sticky searchable library panel (`library-picker.tsx`) with one-click add. Mobile markup unchanged (`md:hidden` / `hidden md:block`).

## Coach logs for a client (2026-09-09)

RLS: coach may insert/update/delete `workouts`, `set_logs`, `workout_exercise_notes`. Client page (coach) shows "Log a workout for {name}" with the next day and a "Choose a different day" list (`/clients/[id]/log`). `/workout/[dayId]?for=<clientId>` opens the same form under the client's account (client's unit, "last time" from the client's history, draft key per client); `finishWorkout`/`skipDay` take `clientId`, no push is sent when the coach logs. Coach can also edit/delete a client's workout from its detail page.

## Second coach (2026-09-10)

`invites` gained `role` (default client) and `full_name`; the sign-up trigger copies both into the profile. Invite for yar.yevd@gmail.com inserted with role coach, name Ярослав; he creates his account via "Create an account". No UI for coach invites yet (DB only). All coaches share everything: every coach sees every client, program, exercise and gets workout-finished pushes. Per-coach separation (coach_id on profiles/programs) is a possible follow-up.

## Weekly Google Drive backup (2026-09-10)

Vercel Cron (`vercel.json`, Sundays 03:00 UTC) → `/api/cron/backup` (guarded by `CRON_SECRET`) → `runBackup()` in `src/lib/backup.ts`: `backup_dump(secret)` SQL function returns every app table as JSON; uploaded to a "myStrong backups" folder in the coach's Google Drive via OAuth refresh token; last 12 files kept. Config lives in `private.backup_state` (secret, refresh token, folder id, last run) and is reached only through secret-gated SECURITY DEFINER functions. One-time connect: Settings → "Connect Google Drive" → `/api/backup/google/start` → Google consent (scope drive.file + email) → `/api/backup/google/callback`. Env: `BACKUP_SECRET`, `CRON_SECRET` (set), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (owner must create an OAuth client in Google Cloud; redirect URI https://mystrong.vercel.app/api/backup/google/callback). auth.users (password hashes) are not in the dump; profiles + invites are enough to re-invite.

## Clients can write their own programs (2026-09-11)

A client is no longer only a recipient. The Program tab leads to "My programs"
(`/my-programs`), where a client builds a plan of their own — weeks, days,
exercises, targets, the same shape the coach builds — and then either trains by
it or sends it to the coach for approval.

- `programs.review_status` (`program_review` enum): `approved` (written or
  approved by a coach — the default, so every existing program behaves exactly as
  before), `self` (the client trains by it alone), `pending` (sent to the coach),
  `changes_requested`. Plus `coach_feedback`, `submitted_at`, `reviewed_at`,
  `reviewed_by`.
- RLS: a client may insert/update/delete `programs` where
  `client_id = created_by = auth.uid()`, and the `program_days` /
  `program_exercises` beneath them (`private.owns_own_program`,
  `private.owns_own_program_day`, in the style of `private.owns_program_day`).
  Coach policies are untouched.
- `private.guard_program_review()` (trigger on insert/update) stops a signed-in
  non-coach from setting anything but `self`/`pending` or writing the review
  columns, so nobody approves their own program. It deliberately skips writes
  with no session (`auth.uid() is null`): service_role, the SQL editor and a
  restore from backup have no client to restrain, and an earlier version of the
  trigger broke exactly those.
- Making a program active has to deactivate the currently active one, which may
  be the coach's — a row the client's policy cannot touch — so it goes through
  `public.set_my_active_program(p_program_id, p_active)` (SECURITY DEFINER,
  checks `client_id = auth.uid()`, execute granted to `authenticated` only;
  Supabase's default privileges hand new functions to `anon` too, hence the
  explicit revoke). `programs_one_active_per_client` still holds.
  `/my-programs` lists the coach's programs with "Switch to it", so the two
  plans can be swapped back and forth.
- Editing is blocked while `pending` ("take it back" un-submits it); editing an
  `approved` program drops it to `self`, because it is no longer what the coach
  approved.
- Coach: pending programs at the top of the Clients screen, a status badge on the
  client page and in the program editor, and an "Approve / Ask for changes" panel
  whose reply the client sees. Push both ways.
- The exercise library is open to clients: anyone may add one, only the author
  (or a coach) may edit or delete it; other entries render read-only.
- Migrations (applied via the Supabase MCP connector, as always — they are in the
  project's migration history, not in this repo): `client_written_programs`,
  `program_review_guard_skips_backend`, `set_my_active_program_authenticated_only`.
- Verified against the live database by running both roles' operations inside a
  rolled-back transaction: a client cannot pre-approve, self-approve, write coach
  feedback, edit or activate the coach's program, add days to it, forge an
  exercise author, or edit the coach's exercises; the coach can approve; exactly
  one program stays active after switching.

## Today metrics and muscle groups (2026-09-12)

Today (`ClientHome`) now opens with three tiles — week streak, workouts in the
last 7 days, days since the last one (`getClientStats`: one query over workout
dates, no set logs). The next-workout card gained the muscle groups the day
works, its exercise and set counts with a rough duration (3 min per set), and a
progress bar "Week 2 of 6 · day 5 of 18". Tiles are hidden until the first
workout is logged.

`getActiveProgram` now returns days as `{ id, week_no, day_no, title, exercises,
sets, muscles }` instead of raw rows with a `count` aggregate; every caller was
updated. Streak logic moved to `src/lib/week.ts` and is shared with `progress.ts`.

Muscle groups are visible wherever an exercise appears: badges on Today, on the
Program tab per day, on the workout screen (per exercise and a summary for the
day), in both day editors, and a scrollable group filter in the exercise library.
Helpers live in `src/lib/muscles.ts`, badges in `src/components/muscle-badges.tsx`.

Library: 73 classic exercises seeded in Ukrainian with muscle groups and short
technique cues (no videos — the coach adds YouTube links). The owner's nine
lowercase test entries were left alone; all nine are referenced by existing
programs, so the app cannot delete them until those programs go.

`Button` now passes `nativeButton={false}` when rendered as a link, which clears
a Base UI console error that fired on most screens.

Design checked in Chromium at 390px through a temporary preview route (the
container's proxy blocks Supabase, so the real data path could not be run
locally).
