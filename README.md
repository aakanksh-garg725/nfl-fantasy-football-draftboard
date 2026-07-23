# NFL Fantasy Football Draftboard

A live, hybrid in-person/virtual fantasy football draft board. The commissioner
runs a shared big-screen board for in-person draft night; remote league
members log in from anywhere and make their own picks in real time, in sync
with everyone else.

Built with Next.js (App Router) and Supabase (Postgres + Auth + Realtime).

## Features

- Configurable draft: 8/10/12/14/16 teams, 15–20 rounds, snake order
- Real accounts + invite links for virtual drafters; no account needed for
  in-person teams (the commissioner runs the shared board on their behalf)
- Live pick timer (2:00 / 1:30 / 1:00) with start/pause/edit/restart,
  auto-starts on the next pick, and auto-skips a pick that hits 0:00 — the
  commissioner can edit any pick (including filling in a skipped one) at any
  time
- Two synced views — Draft Board (team columns × round rows) and Available
  Players (search + position filter) — sharing a header with the timer,
  round/pick, on-the-clock team, and the previous pick
- Player cards color-coded by position (QB/RB/WR/TE/K/DST), imported from
  Sleeper's public API plus a compiled 2026 bye-week schedule
- Optional public, read-only spectator link

## Local development

1. Copy `.env.local.example` to `.env.local` and fill in your Supabase
   project's URL, anon key, and service role key (Project Settings → API).
2. Apply the SQL in `supabase/migrations/` (in order) via the Supabase SQL
   Editor or a direct Postgres connection.
3. `npm install`
4. `npm run dev`
5. Import reference data once (replace `<ADMIN_IMPORT_SECRET>` with the value
   from your `.env.local`):
   ```bash
   curl -X POST http://localhost:3000/api/admin/import-players -H "x-admin-secret: <ADMIN_IMPORT_SECRET>"
   curl -X POST http://localhost:3000/api/admin/import-bye-weeks -H "x-admin-secret: <ADMIN_IMPORT_SECRET>"
   ```

## Deployment

Deploy to Vercel and set the same environment variables from `.env.local` in
the Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_IMPORT_SECRET`), then run the two import commands above against the
deployed URL once.

## Project structure

- `src/app` — routes (auth, dashboard, draft board/players/settings, invite
  acceptance, spectator view, admin import endpoints)
- `src/components/draft` — the draft board UI and realtime state provider
- `src/lib/draft` — pure draft logic (snake order, timer derivation, types)
- `src/lib/supabase` — browser/server/admin Supabase clients
- `supabase/migrations` — schema and RPC functions (the only way clients can
  mutate draft state — see the SQL for the authorization rules)
- `data/bye-weeks-2026.json` — compiled 2026 season bye-week schedule
