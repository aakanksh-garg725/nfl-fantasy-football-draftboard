-- Reverts 0008: draft creation goes back to a direct "number of rounds"
-- choice instead of building a roster position-by-position. Keeps the
-- scoring format selector. Guarded with if-exists/if-not-exists throughout
-- since 0008 may or may not have actually been applied to this database.

alter table public.drafts
  drop column if exists roster_qb,
  drop column if exists roster_rb,
  drop column if exists roster_wr,
  drop column if exists roster_te,
  drop column if exists roster_flex_rb_wr,
  drop column if exists roster_flex_wr_rb_te,
  drop column if exists roster_superflex,
  drop column if exists roster_k,
  drop column if exists roster_dst,
  drop column if exists roster_bench;

alter table public.drafts
  add column if not exists scoring_format text not null default 'ppr'
    check (scoring_format in ('ppr', 'half_ppr', 'non_ppr'));

alter table public.drafts drop constraint if exists drafts_round_count_check;
alter table public.drafts add constraint drafts_round_count_check
  check (round_count between 15 and 20);

drop function if exists public.create_draft(text, int, int, int, int, text[]);
drop function if exists public.create_draft(
  text, int, int, text, int, int, int, int, int, int, int, int, int, int, int, text[]
);

create function public.create_draft(
  p_name text,
  p_season int,
  p_team_count int,
  p_round_count int,
  p_scoring_format text,
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
  v_round int;
  v_pick_in_round int;
  v_team_slot int;
  v_overall int;
  v_is_reversed boolean;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create a draft';
  end if;

  insert into drafts (
    name, season, commissioner_id, team_count, round_count,
    pick_timer_seconds_default, current_overall_pick, scoring_format
  )
  values (
    p_name, p_season, auth.uid(), p_team_count, p_round_count,
    p_pick_timer_seconds_default, 1, p_scoring_format
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

  for v_round in 1..p_round_count loop
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
