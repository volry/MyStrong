# myStrong

A small gym app for one coach and her clients, installed on iPhone as a web app.

- Coach: exercise library with YouTube videos, program builder (weeks, days, targets), copy programs, see client results and comments, progress charts, own training.
- Client: today's workout, set-by-set logging prefilled from last time, comments to the coach, program overview, history, progress charts, and their own program builder — train by it alone or send it to the coach for approval.
- English and Ukrainian UI, kg/lb, push notifications, offline fallback, CSV export and a Google Sheets live link.

## Stack

Vite + React 19 SPA · React Router · Tailwind 4 · shadcn/ui (Base UI) · Recharts · Firebase: Hosting, Auth (email + password), Firestore with offline persistence, Cloud Functions (push, CSV export).

## Development

```bash
npm install && npm --prefix functions install
npm run dev:emulators                      # Auth + Firestore emulators (JDK 21+)
VITE_FIREBASE_EMULATORS=true npm run dev
npm run test:rules
npm run build
npm run deploy                             # app + Security Rules
npm run deploy:functions                   # Cloud Functions (only when functions/ changed)
```

Firebase project: `mystrong-vvr-2026`. See `docs/firebase-migration.md` for the architecture, the data model and the cutover checklist, and `PLAN.md` for decisions and the build log.
