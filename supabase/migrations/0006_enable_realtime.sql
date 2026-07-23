-- Postgres Changes (used by DraftProvider/SpectateView) requires the table
-- to be in the supabase_realtime publication, in addition to RLS allowing
-- the read. Without this, INSERT/UPDATE events never reach subscribed
-- clients even though the underlying writes succeed.
alter publication supabase_realtime add table public.picks;
alter publication supabase_realtime add table public.draft_timer;
alter publication supabase_realtime add table public.drafts;
