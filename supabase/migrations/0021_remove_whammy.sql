-- Removes the whammy feature (see 0011_whammy_timer_hold.sql). The dare pool
-- and popup were client-only (src/lib/draft/whammy.ts et al, now deleted);
-- the only server-side piece was this RPC, which parked started_at in the
-- future to hold the pick clock while the popup was up.
drop function if exists public.hold_timer_for_whammy(uuid, int);
