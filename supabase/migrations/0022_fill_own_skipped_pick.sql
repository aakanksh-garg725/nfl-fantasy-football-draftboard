-- ---------------------------------------------------------------------------
-- make_skipped_pick — lets a drafter fill in their own skipped pick from the
-- search bar or the player pool, without being on the clock and without
-- commissioner involvement.
--
-- Unlike make_pick, this never touches drafts.current_overall_pick: the next
-- team already moved on when skip_expired_pick fired, so this only backfills
-- the slot the skipped team missed, in its original spot in the order. Picks
-- older than the current cursor are otherwise commissioner-only to edit
-- (commissioner_edit_pick) — this is the one case a non-commissioner can
-- write to a pick that isn't the live one.
-- ---------------------------------------------------------------------------
create function public.make_skipped_pick(p_draft_id uuid, p_player_id text)
returns picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member draft_members%rowtype;
  v_pick picks%rowtype;
begin
  -- Lock the draft row so this serializes with make_pick/skip_expired_pick/
  -- commissioner_edit_pick for the same draft instead of racing them.
  perform 1 from drafts where id = p_draft_id for update;

  select * into v_member from draft_members
    where draft_id = p_draft_id and user_id = auth.uid();
  if v_member.user_id is null or v_member.team_id is null then
    raise exception 'not authorized to make this pick';
  end if;

  -- Oldest first: a team can only be skipped once before the board forces
  -- them back on the clock in the normal snake order, but this stays correct
  -- even if that ever isn't true.
  select * into v_pick from picks
    where draft_id = p_draft_id and team_id = v_member.team_id and status = 'skipped'
    order by overall_pick_number asc
    limit 1;
  if v_pick.id is null then
    raise exception 'no skipped pick to fill';
  end if;

  if exists (select 1 from picks where draft_id = p_draft_id and player_id = p_player_id) then
    raise exception 'player already drafted';
  end if;

  update picks
    set player_id = p_player_id,
        status = 'made',
        made_by_user_id = auth.uid(),
        made_at = now()
    where id = v_pick.id and status = 'skipped'
    returning * into v_pick;

  if v_pick.id is null then
    raise exception 'pick already resolved';
  end if;

  return v_pick;
end;
$$;
