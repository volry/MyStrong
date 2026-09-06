# myStrong

A small gym app for one coach and her clients, installed on iPhone as a web app.

- Coach: exercise library with YouTube videos, program builder (weeks, days, targets), copy programs, see client results and comments, progress charts, own training.
- Client: today's workout, set-by-set logging prefilled from last time, comments to the coach, program overview, history, progress charts.
- English and Ukrainian UI, kg/lb, push notifications, offline fallback, CSV export and a Google Sheets live link.

## Stack

Next.js 16 (App Router) · Tailwind 4 · shadcn/ui · Supabase (Postgres, Auth, RLS) · Recharts · Vercel.

## Development

```bash
npm install
vercel env pull   # writes .env.local (Supabase URL/key, VAPID keys)
npm run dev
```

Production: https://mystrong.vercel.app. Pushes to `main` deploy automatically.

See `PLAN.md` for decisions and the build log.
