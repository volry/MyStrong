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

## Rest timer and the exercise sheet (2026-09-13)

Two things the owner missed from Strong.

**Rest timer.** `profiles.rest_timer_sec` (0 = off, otherwise 60–180 s, chosen in
Settings; the column grant list now includes it). Ticking a set starts a
countdown pinned above the tab bar with −15 s / +15 s / skip; at zero it beeps
(WebAudio primed on the tick, so iOS allows it) and vibrates where supported. It
never blocks the form, and stays off for anyone who does not turn it on.

**Exercise sheet.** Tapping an exercise name in a workout — or the chart button
on the right of the card — opens a bottom sheet (Base UI Dialog) with four tabs:
About (video and cues), History (every past session with its sets), Charts (best
set and volume over time), Records (best set, est. 1RM, best volume, most reps,
longest hold, totals). `getExerciseStats` fetches all of it for the day's
exercises in one query while the page renders, so opening the sheet costs no
round trip and survives a flaky gym connection.

`TrendChart` (`src/components/trend-chart.tsx`) is the small one-series chart the
sheet uses, in the same validated colours as the progress screen.

Checked in Chromium at 390px: ticking a set starts the countdown, and all four
tabs render (temporary preview route with fixed data — the container's proxy
blocks Supabase, so the real data path cannot run locally).

## Focus metric picker (2026-09-13)

The chart button on an exercise card used to open the same sheet as the exercise
name, only on another tab — two doors to one room. It now opens a compact picker,
the way Strong does it: the four numbers you can watch for that exercise, each
with today's value, and a tick on the chosen one.

- Metrics: total volume, volume increase against the last session, total reps,
  heaviest set. Counted client-side from the sets ticked so far, so they move as
  you train; the previous session's volume comes from the stats already loaded
  for the sheet (converted into the display unit before the percentage).
- The choice shows as a live line on the card and is stored per person per
  exercise in `exercise_focus` (own rows only). It is saved in the background so
  the tap feels instant, and under the client's id when the coach logs for them.
- Timed exercises (planks, cardio) have no focus line — volume and reps say
  nothing there.
- Tapping the exercise name still opens the full sheet, unchanged.

## Progress screen: a list, not a dropdown (2026-09-13)

Progress used to hide every exercise behind a `<select>`: one chart at a time,
and no way to see what else is there. It is now a scrollable list of cards —
name, muscle badge, how many workouts and when the last one was, best set and
estimated 1RM, and one chart — so scrolling down walks through the whole log.

Filters keep the list short:

- **Search** by name.
- **Muscle group** chips, offering only the groups actually trained.
- **Chart** switch (best set / volume / est. 1RM) — it changes every card at
  once, so exercises stay comparable, and the line explaining volume or 1RM
  shows only when that measure is on.
- **Sort** (recent / A–Z / most trained) and a **2+ workouts** filter that hides
  one-off exercises.

Six cards render at a time behind a "Show more" button: each card is a Recharts
chart, and a phone should not mount thirty of them to show three. Any filter
change resets the list to the top of the page.

`getProgress` now returns each exercise's muscle group and the date it was last
trained, and sorts by recency instead of session count — the default order the
list wants.

Exercises logged without weight (planks, cardio) say so instead of drawing an
empty chart. Counts read "Workouts: 3" / "Тренувань: 3" so Ukrainian plural
forms stay correct at every number.

Checked in Chromium at 390px on the temporary preview route: filters, search,
metric switch, "Show more", and the no-weight card.

## Achievements (2026-09-13)

Badges for what the log already proves: consistency, records, volume, and
getting through a program. Nothing is stored — `replayAchievements` walks the
finished workouts oldest-first and replays the counters, so every badge also
carries the date it was earned and the workout that earned it. A corrected or
deleted workout corrects the badges with it, and there is no table to drift.

Twenty-eight badges in four families:

- **Consistency** — first workout, 10 / 25 / 50 / 100 workouts, and 2 / 4 / 8 /
  12 / 26 weeks in a row (the longest run ever, not the current one).
- **Records** — 1 / 10 / 25 personal records (beating your own best weight in an
  exercise; a first session is not a record), and 60 / 80 / 100 kg in one set.
- **Volume** — 10 / 50 / 100 t lifted in total, and 5 / 10 t in a single workout.
- **Program and variety** — 10 / 25 / 50 different exercises, 4 muscle groups and
  then the whole body inside one week, 4 full program weeks, a program finished.

Thresholds are picked so the Ukrainian names stay grammatical at every number,
and the running totals read "Тренувань: 34" for the same reason.

Where they show up:

- A strip on **Progress**: earned badges, the count, and the closest locked one
  with a bar. It links to `/achievements`; the coach sees the same strip on a
  client's progress page, without the link.
- **`/achievements`** lists all four families as ladders — earned ones show their
  date, locked ones their progress.
- **After a workout**: `finishWorkout` checks what that workout unlocked and, if
  anything did, lands on `/achievements?new=<id>` with a card naming it instead
  of dropping back on Today. Nothing unlocked means the old redirect, so ordinary
  days cost no extra tap.

`replayAchievements` is pure and was checked against handmade logs: streaks
surviving a gap, two workouts in one week counting once, a first session not
counting as a record, volume totals, muscle groups adding up across a week,
program weeks not counting twice when a day is repeated, and an empty log.

Checked in Chromium at 390px: the strip, the full list, and the post-workout card.

## Typography (2026-09-17)

Two problems, one visible, one not:

- `--font-sans` was defined as `var(--font-sans)` — a self-reference dating to the
  first commit. It never resolved, so `font-sans` fell through to the browser
  default and the whole app rendered in a **serif**, while the layout was loading
  Geist for nothing. It now names `--font-geist-sans` with a system stack behind it.
- The type scale was one step below what a phone held at arm's length in a gym
  wants. Tailwind's `--text-*` variables are overridden once in `@theme`: xs 13,
  sm 15, base 17, lg 19, xl 21, 2xl 26, with matching line heights, and `body`
  set to 17px for text that carries no size class. Spacing is untouched — only
  the type grows, so no screen re-flows.

Geist is wider than the serif it replaced, which broke two places that were sized
around the old metrics:

- The tab bar's longest label ("Налаштування") no longer fit a fifth of the
  screen. Labels are now `min(10px, 2.6vw)` with tight tracking — whole down to
  360px, and truncation only as a last resort below that.
- The workout grid's "previous" column (3.75rem) cut "102.5 × 12"; it is 5rem now,
  which the weight and reps inputs can spare.

Checked in Chromium at 390 / 360 / 320px: program list, workout grid, achievements
strip and rows, tab bar — no horizontal overflow, no clipped labels.

## Adding an exercise from the workout screen (2026-09-17)

A client could already edit a program they wrote themselves, but only through
Program → "My programs" → the program → the day. Mid-workout, with a barbell
waiting, that path does not exist. Two ways in now:

- **On the workout screen**, under the exercise cards: pick from the library and
  the exercise is added to that day of the program — not just to today's session,
  so it is there next time as well. `addExerciseToDay` refuses politely when the
  plan was written by a coach ("only they can change it") or is out for review;
  a coach may add to any program, as their RLS already allows. An approved
  program drops to `self` on the first change, the same rule the day editor uses.
  The link "Edit this day" sits next to it for targets, order and removal.
- **On the Program tab**, each day of a program the client wrote gets a pencil
  that opens the day editor directly.

The workout draft in localStorage is keyed by `program_exercise` id and only
restores ids that still exist, so a refresh after adding keeps everything typed
so far and gives the new exercise fresh rows.

Removal now checks first: `set_logs` hang off `program_exercises`, so deleting a
row that has logged sets would take that history with it. The day editor refuses
with a message and points at days not yet trained. (The coach's own day editor
still deletes without that check — a follow-up.)

## "Start the workout" (2026-09-18)

The screen had a finish and no beginning: you opened a day and typed. Now a
primary button starts the session, and a sticky bar at the top of the screen
counts the time while you scroll through the exercises — the shape Strong uses.

- The start time lives in the localStorage draft next to the rows, so locking the
  phone, leaving the app, or reloading mid-session keeps the clock honest.
- The bar recomputes from the timestamp on every tick rather than counting
  seconds, so a slept phone shows the right number when it wakes.
- `finishWorkout` takes `startedAt` and writes it to `performed_at`: a workout
  belongs to the moment it began, not the moment it was saved. `performedAtFrom`
  ignores a start time in the future or more than 12 hours old (a session left
  open overnight), and falls back to the database default.
- Nothing is required: without tapping start, everything behaves as before.

No schema change. Showing the duration in history would need a column
(`workouts.duration_sec`, or reading `created_at - performed_at`) — a follow-up.

## Workout duration in the database (2026-09-18)

Migration `workouts_duration_sec` (applied through the Supabase connector, as
always — it lives in the project's migration history, not in this repo):

```sql
alter table public.workouts
  add column duration_sec integer,
  add constraint workouts_duration_sec_sane
    check (duration_sec is null or (duration_sec > 0 and duration_sec <= 43200));
```

- `finishWorkout` measures from the "Start the workout" tap to the save and
  writes both `performed_at` (the start) and `duration_sec`. Under a minute is
  treated as a mis-tap and left null, as is a session older than 12 hours.
- Null means the clock was never started, so every workout logged before today
  stays null and every screen simply omits the duration.
- Shown on the history list, the workout detail (a badge next to the date), and
  the coach's recent-workouts list. `formatDuration` prints "52 хв" / "1 год 05 хв".
- No column-level grants on `workouts`, so `authenticated` reaches the new column
  and the existing row policies still decide who may write it. Verified on the
  live database inside a rolled-back transaction: as the client, insert 3120 and
  update to 3600 both succeed, and 999999 is rejected by the check constraint.
- The Google Sheets export (`export_sets`) still returns set rows only; adding
  duration there would mean changing the function and the sheet's columns.

## Warm-up and cool-down as text (2026-09-18)

A day can carry a warm-up and a cool-down written as plain lines — "10 присідань
/ рол на спину / потягнути стегно". They are read, never logged: no sets, no
weights, nothing to tick, because counting a foam roll is not the point.

Migration `program_days_warmup_cooldown`:

```sql
alter table public.program_days
  add column warmup text,
  add column cooldown text,
  add constraint program_days_warmup_length check (warmup is null or char_length(warmup) <= 2000),
  add constraint program_days_cooldown_length check (cooldown is null or char_length(cooldown) <= 2000);
```

- Both day editors (the coach's and the client's own) gained two textareas next
  to the day title, sharing `DayBlocks`; `form.text()` trims and caps at the
  2000 the column allows, so a paste can never hit the constraint.
- The workout screen renders the warm-up above the first exercise and the
  cool-down below the last one, as a bulleted list of the non-empty lines.
  Empty blocks render nothing at all.
- Duplicating a week and copying a program carry the text with the day; without
  that, week two of a duplicated program would silently lose its warm-up.
- Verified on the live database in a rolled-back transaction: the client writes
  three lines to a day of their own program, touches zero rows on the coach's
  day, and 2100 characters are refused by the check.

## Picking an exercise (2026-09-18)

Adding an exercise meant scrolling a `<select>` of seventy names — unusable on a
phone between sets. `ExercisePicker` replaces it everywhere a single exercise is
chosen: the workout screen, the client's day editor and the coach's mobile day
editor.

- Search by name, plus a chip per muscle group — only the groups the library
  actually covers, so the row stays short.
- Rows carry the group in its own colour (the same `MUSCLE_BADGE` tints as the
  rest of the app), the list scrolls inside `max-h-64`, and the count below says
  how many the filters left.
- The chosen id rides in a hidden input, so it drops into the existing server
  action forms in place of the `<select>`; the workout screen drives it with
  `value`/`onChange` instead.
- Narrowing the filters clears a selection they hide, so "Add" can never take an
  exercise that is no longer on screen. Done in the filter handlers rather than
  an effect, which the React Compiler lint rules reject.
- `ex.count` now reads "Вправ: 3" rather than "3 вправ", which is wrong Ukrainian
  at most numbers.

The coach's desktop side panel keeps its own one-tap-add list, which already had
a search box.

Checked in Chromium at 390px: chips filter, a pick writes the id into the hidden
input, filtering the pick away clears it, and picking a visible one sets it again.
