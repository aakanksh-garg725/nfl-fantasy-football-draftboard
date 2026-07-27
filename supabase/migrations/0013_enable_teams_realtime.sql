-- DraftProvider now subscribes to postgres_changes on teams (rename_team,
-- reorder_teams) so the board/settings/etc. update live instead of needing
-- a refresh. Same requirement as 0006 — the table must be in the
-- supabase_realtime publication for those events to reach clients.
alter publication supabase_realtime add table public.teams;
