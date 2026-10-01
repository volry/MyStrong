# myStrong — notes for coding agents

- Stack: Vite + React 19 SPA with React Router, Firebase (Auth, Firestore with offline persistence, Cloud Functions, Hosting). No Next.js, no server components.
- Screens read data only through `useData()` (`src/data/store.tsx`) and pure selectors in `src/lib/`; they write through `src/data/actions/*`, which do not await the server (offline-first).
- Any change to what a role may read or write goes into `firestore.rules` together with a case in `scripts/firestore-rules.test.mjs` (`npm run test:rules`, needs JDK 21+).
- Architecture, data model and deployment: `docs/firebase-migration.md`.
