-- Persists the roster breakdown chosen on the create-draft form (see
-- src/app/dashboard/new/page.tsx / RosterCounts in src/lib/draft/types.ts) on
-- the drafts row itself, rather than discarding it after deriving
-- round_count. The new Roster tab (src/app/draft/[draftId]/roster) needs
-- these counts at any point during the draft to know each team's starting
-- slots (QB/RB/WR/TE/flex/superflex/K/DST) and bench size. Still
-- informational/derived only — nothing in make_pick enforces position limits.
alter table public.drafts
  add column if not exists roster_qb int not null default 1 check (roster_qb between 0 and 8),
  add column if not exists roster_rb int not null default 2 check (roster_rb between 0 and 8),
  add column if not exists roster_wr int not null default 2 check (roster_wr between 0 and 8),
  add column if not exists roster_te int not null default 1 check (roster_te between 0 and 8),
  add column if not exists roster_flex_rb_wr int not null default 0 check (roster_flex_rb_wr between 0 and 8),
  add column if not exists roster_flex_wr_rb_te int not null default 1 check (roster_flex_wr_rb_te between 0 and 8),
  add column if not exists roster_superflex int not null default 0 check (roster_superflex between 0 and 8),
  add column if not exists roster_k int not null default 1 check (roster_k between 0 and 8),
  add column if not exists roster_dst int not null default 1 check (roster_dst between 0 and 8),
  add column if not exists roster_bench int not null default 6 check (roster_bench >= 0);

drop function if exists public.create_draft(text, int, int, int, text, int, text[]);

create function public.create_draft(
  p_name text,
  p_season int,
  p_team_count int,
  p_scoring_format text,
  p_roster_qb int,
  p_roster_rb int,
  p_roster_wr int,
  p_roster_te int,
  p_roster_flex_rb_wr int,
  p_roster_flex_wr_rb_te int,
  p_roster_superflex int,
  p_roster_k int,
  p_roster_dst int,
  p_roster_bench int,
  p_pick_timer_seconds_default int,
  p_team_names text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
  v_team_id uuid;
  v_round_count int;
  v_round int;
  v_pick_in_round int;
  v_team_slot int;
  v_overall int;
  v_is_reversed boolean;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create a draft';
  end if;

  v_round_count := p_roster_qb + p_roster_rb + p_roster_wr + p_roster_te
    + p_roster_flex_rb_wr + p_roster_flex_wr_rb_te + p_roster_superflex
    + p_roster_k + p_roster_dst + p_roster_bench;

  if v_round_count < 1 then
    raise exception 'roster must have at least one slot';
  end if;

  insert into drafts (
    name, season, commissioner_id, team_count, round_count,
    pick_timer_seconds_default, current_overall_pick, scoring_format,
    roster_qb, roster_rb, roster_wr, roster_te,
    roster_flex_rb_wr, roster_flex_wr_rb_te, roster_superflex,
    roster_k, roster_dst, roster_bench
  )
  values (
    p_name, p_season, auth.uid(), p_team_count, v_round_count,
    p_pick_timer_seconds_default, 1, p_scoring_format,
    p_roster_qb, p_roster_rb, p_roster_wr, p_roster_te,
    p_roster_flex_rb_wr, p_roster_flex_wr_rb_te, p_roster_superflex,
    p_roster_k, p_roster_dst, p_roster_bench
  )
  returning id into v_draft_id;

  insert into draft_members (draft_id, user_id, role)
  values (v_draft_id, auth.uid(), 'commissioner');

  for v_team_slot in 1..p_team_count loop
    insert into teams (draft_id, slot_number, team_name)
    values (
      v_draft_id,
      v_team_slot,
      coalesce(p_team_names[v_team_slot], 'Team ' || v_team_slot)
    );
  end loop;

  for v_round in 1..v_round_count loop
    v_is_reversed := (v_round % 2 = 0);
    for v_pick_in_round in 1..p_team_count loop
      v_team_slot := case
        when v_is_reversed then p_team_count - v_pick_in_round + 1
        else v_pick_in_round
      end;
      v_overall := (v_round - 1) * p_team_count + v_pick_in_round;

      select id into v_team_id from teams
        where draft_id = v_draft_id and slot_number = v_team_slot;

      insert into picks (draft_id, round, pick_in_round, overall_pick_number, team_id)
      values (v_draft_id, v_round, v_pick_in_round, v_overall, v_team_id);
    end loop;
  end loop;

  insert into draft_timer (draft_id, status, duration_seconds, remaining_seconds)
  values (v_draft_id, 'stopped', p_pick_timer_seconds_default, p_pick_timer_seconds_default);

  return v_draft_id;
end;
$$;
