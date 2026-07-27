-- reorder_teams — commissioner drags team slots into a new draft order
-- before the draft starts. Reassigns teams.slot_number to match the given
-- order, then re-points the pre-generated picks skeleton (built at
-- create_draft time, see 0010) at the new slot -> team mapping using the
-- same snake formula as create_draft / snake.ts. Only allowed while
-- drafts.status = 'setup', which is also the only state where every pick
-- row is guaranteed still 'pending' with no player_id/team ownership to
-- disturb (status flips to 'in_progress' on the first make_pick/skip).

create function public.reorder_teams(p_draft_id uuid, p_team_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_team_count int;
  v_distinct_count int;
  v_matched_count int;
  v_slot int;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can reorder teams';
  end if;

  select status, team_count into v_status, v_team_count
    from drafts where id = p_draft_id;

  if v_status is null then
    raise exception 'draft not found';
  end if;

  if v_status <> 'setup' then
    raise exception 'teams can only be reordered before the draft starts';
  end if;

  if coalesce(array_length(p_team_ids, 1), 0) <> v_team_count then
    raise exception 'expected % team ids, got %', v_team_count, coalesce(array_length(p_team_ids, 1), 0);
  end if;

  select count(distinct t) into v_distinct_count from unnest(p_team_ids) t;
  if v_distinct_count <> v_team_count then
    raise exception 'team ids must be unique';
  end if;

  select count(*) into v_matched_count
    from teams where draft_id = p_draft_id and id = any(p_team_ids);
  if v_matched_count <> v_team_count then
    raise exception 'team ids must all belong to this draft';
  end if;

  -- Bump slot_number out of range first so the per-row updates below never
  -- collide with the unique (draft_id, slot_number) constraint mid-loop.
  update teams set slot_number = slot_number + v_team_count
    where draft_id = p_draft_id;

  for v_slot in 1..v_team_count loop
    update teams set slot_number = v_slot
      where id = p_team_ids[v_slot] and draft_id = p_draft_id;
  end loop;

  update picks p
    set team_id = t.id
    from teams t
    where p.draft_id = p_draft_id
      and t.draft_id = p_draft_id
      and t.slot_number = case
        when p.round % 2 = 0 then v_team_count - p.pick_in_round + 1
        else p.pick_in_round
      end;
end;
$$;
