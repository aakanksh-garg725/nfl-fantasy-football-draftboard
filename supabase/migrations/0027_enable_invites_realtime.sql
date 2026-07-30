-- Postgres Changes requires the table to be in the supabase_realtime
-- publication (same gap as 0006/0013 for picks/draft_timer/drafts/teams).
-- Without this, a new invite never reaches the invitee's dashboard until
-- they reload the page — PendingInvites.tsx now subscribes to this table so
-- an invite shows up live instead. RLS already scopes reads to the invitee
-- (invited_user_id = auth.uid()) or the draft's commissioner, see
-- 0016_email_invites.sql, so this only adds delivery, not access.
alter publication supabase_realtime add table public.invites;
