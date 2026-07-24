@AGENTS.md

# NFL Fantasy Football Draftboard

Live hybrid in-person/virtual snake draft board. Next.js App Router +
Supabase (Postgres + Auth + Realtime). See README.md for setup/features.

## Architecture rules (non-obvious, load-bearing)

- **All draft state mutations go through Postgres RPC functions**
  (`supabase/migrations/*.sql`), never direct table `insert`/`update` from the
  client. Auth/business-rule checks (commissioner-only, turn order, timer
  state) live in the SQL function body. New mutation = new migration file
  (`000N_description.sql`) + a `supabase.rpc("fn_name", {...})` call. Check
  existing RPCs before adding a new one — many already exist (see
  `src/components/draft/DraftProvider.tsx` and other components for the
  current list of `.rpc(...)` calls).
- **DB rows are snake_case, app types are camelCase.** Never pass a raw row
  into a component — always go through a `map*Row` function in
  `src/lib/draft/mappers.ts`. Add a new mapper there for any new table.
- **`src/lib/draft/*` is pure logic, no Supabase/React imports** — snake
  order (`snake.ts`), timer math (`timer.ts`), types (`types.ts`). Keep it
  that way so it stays unit-testable and usable from both client and RPC
  reference docs. `snake.ts`'s JS mirrors SQL logic in
  `0002_rpc_functions.sql` exactly — if one changes, change both.
- **Realtime sync**: `DraftProvider` subscribes to Postgres changes for
  picks/timer/draft rows and merges them into local state; it's the only
  place that should hold live draft state. New realtime-driven UI should
  read from `useDraft()`, not add its own subscription.
- **Timer display** is derived (`deriveRemainingSeconds`), not stored
  client-side as a running countdown — it's computed from `started_at` +
  server clock offset (`useServerClockOffset`) each tick, so multiple clients
  never drift apart. Don't reintroduce a local `setInterval` countdown.
- Admin import routes (`/api/admin/import-*`) require
  `x-admin-secret` header matching `ADMIN_IMPORT_SECRET`; they use the
  service-role Supabase client (`src/lib/supabase/admin.ts`) since they run
  without a signed-in commissioner session.

## Conventions

- Path alias `@/*` → `src/*`.
- Tailwind v4 (CSS-based config, no `tailwind.config.js`) — check
  `globals.css` for theme tokens before hardcoding colors; positions have
  fixed colors in `src/lib/draft/positionStyle.ts`.
- Long player lists use `@tanstack/react-virtual` (see
  `AvailablePlayersPanel.tsx`) — keep new large list UIs virtualized.
- `npm run lint` before considering a change done; no test suite currently
  exists.
