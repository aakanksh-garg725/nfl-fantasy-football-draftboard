-- create_draft's round count is now the sum of a roster breakdown chosen on
-- the create-draft form (QB/RB/WR/TE/flex/superflex/K/DST/bench slots, see
-- src/app/dashboard/new/page.tsx), not a direct 15-20 pick. Loosen the check
-- constraint to a broad sanity range instead of the old fixed window.
alter table public.drafts drop constraint if exists drafts_round_count_check;
alter table public.drafts add constraint drafts_round_count_check
  check (round_count between 1 and 50);
