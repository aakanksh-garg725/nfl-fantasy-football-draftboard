-- update_roster_settings — lets the commissioner edit the roster breakdown
-- (0020_roster_breakdown.sql) after the draft's already been created, from
-- the new "Edit Roster" dialog on the settings page. Commissioner-only, and
-- only while the draft is still in 'setup' — round_count driving the pick
-- order is baked into every downstream screen (board, roster, timer round
-- label), so it can't move once picks are live.
--
-- Rebuilds the picks skeleton to match, the same generation loop create_draft
-- (0020_roster_breakdown.sql) uses. Upserts on the (draft_id,
-- overall_pick_number) unique constraint rather than delete-then-reinsert so
-- every pick whose slot still exists after the edit keeps its row id —
-- clients get plain UPDATE realtime events for those, not a delete+insert
-- pair. Safe to touch every pick unconditionally because 'setup' guarantees
-- none of them are anything but 'pending' yet.
create function public.update_roster_settings(
  p_draft_id uuid,
  p_roster_qb int,
  p_roster_rb int,
  p_roster_wr int,
  p_roster_te int,
  p_roster_flex_rb_wr int,
  p_roster_flex_wr_rb_te int,
  p_roster_superflex int,
  p_roster_k int,
  p_roster_dst int,
  p_roster_bench int
)
returns drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
  v_round_count int;
  v_team_id uuid;
  v_round int;
  v_pick_in_round int;
  v_team_slot int;
  v_overall int;
  v_is_reversed boolean;
begin
  -- Lock the draft row so this serializes with anything else touching this
  -- draft's picks/status concurrently.
  select * into v_draft from drafts where id = p_draft_id for update;
  if v_draft.id is null then
    raise exception 'draft not found';
  end if;

  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can edit roster settings';
  end if;

  if v_draft.status <> 'setup' then
    raise exception 'roster settings are locked once the draft has started';
  end if;

  v_round_count := p_roster_qb + p_roster_rb + p_roster_wr + p_roster_te
    + p_roster_flex_rb_wr + p_roster_flex_wr_rb_te + p_roster_superflex
    + p_roster_k + p_roster_dst + p_roster_bench;

  if v_round_count < 1 then
    raise exception 'roster must have at least one slot';
  end if;

  update drafts
    set round_count = v_round_count,
        roster_qb = p_roster_qb,
        roster_rb = p_roster_rb,
        roster_wr = p_roster_wr,
        roster_te = p_roster_te,
        roster_flex_rb_wr = p_roster_flex_rb_wr,
        roster_flex_wr_rb_te = p_roster_flex_wr_rb_te,
        roster_superflex = p_roster_superflex,
        roster_k = p_roster_k,
        roster_dst = p_roster_dst,
        roster_bench = p_roster_bench
    where id = p_draft_id
    returning * into v_draft;

  for v_round in 1..v_round_count loop
    v_is_reversed := (v_round % 2 = 0);
    for v_pick_in_round in 1..v_draft.team_count loop
      v_team_slot := case
        when v_is_reversed then v_draft.team_count - v_pick_in_round + 1
        else v_pick_in_round
      end;
      v_overall := (v_round - 1) * v_draft.team_count + v_pick_in_round;

      select id into v_team_id from teams
        where draft_id = p_draft_id and slot_number = v_team_slot;

      insert into picks (draft_id, round, pick_in_round, overall_pick_number, team_id)
      values (p_draft_id, v_round, v_pick_in_round, v_overall, v_team_id)
      on conflict (draft_id, overall_pick_number)
      do update set round = excluded.round,
                    pick_in_round = excluded.pick_in_round,
                    team_id = excluded.team_id;
    end loop;
  end loop;

  -- Roster shrank: drop whatever used to extend past the new last round.
  delete from picks
    where draft_id = p_draft_id
      and overall_pick_number > v_round_count * v_draft.team_count;

  return v_draft;
end;
$$;
