-- All mutating operations funnel through these SECURITY DEFINER functions so
-- authorization and race-condition handling live in one place. Tables have
-- no direct client INSERT/UPDATE grants for drafts/teams/draft_members/
-- picks/draft_timer — only these RPCs (and the service-role player import
-- route) write to them.

-- ---------------------------------------------------------------------------
-- get_server_now — lets clients calibrate their local clock offset once on
-- connect, so the timer countdown agrees across every screen regardless of
-- local clock accuracy.
-- ---------------------------------------------------------------------------
create function public.get_server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

-- ---------------------------------------------------------------------------
-- create_draft — creates the draft, its team slots, the full snake-order
-- picks skeleton, the timer row, and adds the caller as commissioner.
-- ---------------------------------------------------------------------------
create function public.create_draft(
  p_name text,
  p_season int,
  p_team_count int,
  p_round_count int,
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
    pick_timer_seconds_default, current_overall_pick
  )
  values (
    p_name, p_season, auth.uid(), p_team_count, p_round_count,
    p_pick_timer_seconds_default, 1
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

-- ---------------------------------------------------------------------------
-- accept_invite — atomic, re-checks status='pending' to prevent double-accept.
-- ---------------------------------------------------------------------------
create function public.accept_invite(p_token text)
returns uuid -- draft_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to accept an invite';
  end if;

  update invites
    set status = 'accepted', accepted_by = auth.uid()
    where token = p_token
      and status = 'pending'
      and (expires_at is null or expires_at > now())
    returning * into v_invite;

  if v_invite.id is null then
    raise exception 'invite is invalid, expired, or already used';
  end if;

  update teams set owner_user_id = auth.uid() where id = v_invite.team_id;

  insert into draft_members (draft_id, user_id, role, team_id)
  values (v_invite.draft_id, auth.uid(), 'drafter', v_invite.team_id)
  on conflict (draft_id, user_id) do update
    set role = 'drafter', team_id = excluded.team_id;

  return v_invite.draft_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Timer transitions — commissioner-only.
-- ---------------------------------------------------------------------------
create function public.start_timer(p_draft_id uuid)
returns draft_timer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer draft_timer%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can control the timer';
  end if;

  update draft_timer
    set status = 'running', started_at = now(), updated_at = now(), updated_by = auth.uid()
    where draft_id = p_draft_id and status in ('stopped', 'paused')
    returning * into v_timer;

  if v_timer.draft_id is null then
    raise exception 'timer is already running';
  end if;
  return v_timer;
end;
$$;

create function public.pause_timer(p_draft_id uuid)
returns draft_timer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer draft_timer%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can control the timer';
  end if;

  update draft_timer
    set remaining_seconds = greatest(0, remaining_seconds - floor(extract(epoch from (now() - started_at)))::int),
        status = 'paused',
        started_at = null,
        updated_at = now(),
        updated_by = auth.uid()
    where draft_id = p_draft_id and status = 'running'
    returning * into v_timer;

  if v_timer.draft_id is null then
    raise exception 'timer is not running';
  end if;
  return v_timer;
end;
$$;

create function public.restart_timer(p_draft_id uuid)
returns draft_timer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer draft_timer%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can control the timer';
  end if;

  update draft_timer
    set remaining_seconds = duration_seconds,
        status = 'stopped',
        started_at = null,
        updated_at = now(),
        updated_by = auth.uid()
    where draft_id = p_draft_id
    returning * into v_timer;

  return v_timer;
end;
$$;

-- p_apply_to: 'current' adjusts the in-flight pick's remaining time only;
-- 'default' additionally updates drafts.pick_timer_seconds_default for all
-- future picks.
create function public.edit_timer(
  p_draft_id uuid,
  p_new_duration_seconds int,
  p_apply_to text default 'current'
)
returns draft_timer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer draft_timer%rowtype;
  v_elapsed int;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can control the timer';
  end if;
  if p_apply_to not in ('current', 'default') then
    raise exception 'p_apply_to must be ''current'' or ''default''';
  end if;

  select * into v_timer from draft_timer where draft_id = p_draft_id;

  if v_timer.status = 'running' then
    v_elapsed := floor(extract(epoch from (now() - v_timer.started_at)))::int;
    update draft_timer
      set duration_seconds = p_new_duration_seconds,
          remaining_seconds = greatest(0, p_new_duration_seconds - v_elapsed),
          started_at = now(),
          updated_at = now(),
          updated_by = auth.uid()
      where draft_id = p_draft_id
      returning * into v_timer;
  else
    update draft_timer
      set duration_seconds = p_new_duration_seconds,
          remaining_seconds = p_new_duration_seconds,
          updated_at = now(),
          updated_by = auth.uid()
      where draft_id = p_draft_id
      returning * into v_timer;
  end if;

  if p_apply_to = 'default' then
    update drafts set pick_timer_seconds_default = p_new_duration_seconds where id = p_draft_id;
  end if;

  return v_timer;
end;
$$;

-- Resets the timer to the configured default and immediately starts it
-- (confirmed product behavior: the next pick's clock auto-starts).
create function public.reset_timer_for_next_pick(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default int;
begin
  select pick_timer_seconds_default into v_default from drafts where id = p_draft_id;

  update draft_timer
    set duration_seconds = v_default,
        remaining_seconds = v_default,
        status = 'running',
        started_at = now(),
        updated_at = now()
    where draft_id = p_draft_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- make_pick — the only way a player gets attached to a pick during live play.
-- ---------------------------------------------------------------------------
create function public.make_pick(p_draft_id uuid, p_player_id text)
returns picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
  v_current_pick picks%rowtype;
  v_member draft_members%rowtype;
begin
  -- Lock the draft row so concurrent make_pick/skip_expired_pick calls for
  -- this draft serialize instead of racing each other.
  select * into v_draft from drafts where id = p_draft_id for update;
  if v_draft.id is null then
    raise exception 'draft not found';
  end if;

  select * into v_current_pick from picks
    where draft_id = p_draft_id and overall_pick_number = v_draft.current_overall_pick;
  if v_current_pick.id is null then
    raise exception 'draft is already complete';
  end if;

  select * into v_member from draft_members
    where draft_id = p_draft_id and user_id = auth.uid();
  if v_member.user_id is null
     or (v_member.role <> 'commissioner' and v_member.team_id <> v_current_pick.team_id) then
    raise exception 'not authorized to make this pick';
  end if;

  if exists (select 1 from picks where draft_id = p_draft_id and player_id = p_player_id) then
    raise exception 'player already drafted';
  end if;

  update picks
    set player_id = p_player_id,
        status = 'made',
        made_by_user_id = auth.uid(),
        made_at = now()
    where id = v_current_pick.id and status = 'pending'
    returning * into v_current_pick;

  if v_current_pick.id is null then
    raise exception 'pick already resolved';
  end if;

  update drafts
    set current_overall_pick = current_overall_pick + 1,
        status = 'in_progress'
    where id = p_draft_id;

  perform reset_timer_for_next_pick(p_draft_id);

  return v_current_pick;
end;
$$;

-- ---------------------------------------------------------------------------
-- skip_expired_pick — called by any connected client's local tick when it
-- observes the countdown reach zero. Re-derives the real remaining time
-- server-side before acting, so a client with a wrong local clock can't
-- force an early skip, and concurrent calls from multiple clients are
-- harmless (only the first finds status='running' with time genuinely up).
-- ---------------------------------------------------------------------------
create function public.skip_expired_pick(p_draft_id uuid)
returns picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
  v_timer draft_timer%rowtype;
  v_current_pick picks%rowtype;
  v_real_remaining int;
begin
  if not is_draft_member(p_draft_id) then
    raise exception 'not a member of this draft';
  end if;

  select * into v_draft from drafts where id = p_draft_id for update;
  select * into v_timer from draft_timer where draft_id = p_draft_id;

  if v_timer.status <> 'running' then
    raise exception 'timer is not running';
  end if;

  v_real_remaining := v_timer.remaining_seconds
    - floor(extract(epoch from (now() - v_timer.started_at)))::int;
  if v_real_remaining > 0 then
    raise exception 'timer has not expired yet';
  end if;

  select * into v_current_pick from picks
    where draft_id = p_draft_id and overall_pick_number = v_draft.current_overall_pick;
  if v_current_pick.id is null then
    raise exception 'draft is already complete';
  end if;

  update picks
    set status = 'skipped'
    where id = v_current_pick.id and status = 'pending'
    returning * into v_current_pick;

  if v_current_pick.id is null then
    raise exception 'pick already resolved';
  end if;

  update drafts
    set current_overall_pick = current_overall_pick + 1,
        status = 'in_progress'
    where id = p_draft_id;

  perform reset_timer_for_next_pick(p_draft_id);

  return v_current_pick;
end;
$$;

-- ---------------------------------------------------------------------------
-- commissioner_edit_pick — fill in a skipped pick once known, or correct a
-- misclick on any past pick. Does not touch drafts.current_overall_pick.
-- ---------------------------------------------------------------------------
create function public.commissioner_edit_pick(p_pick_id uuid, p_player_id text)
returns picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pick picks%rowtype;
begin
  select * into v_pick from picks where id = p_pick_id;
  if v_pick.id is null then
    raise exception 'pick not found';
  end if;
  if not is_draft_commissioner(v_pick.draft_id) then
    raise exception 'only the commissioner can edit picks';
  end if;

  if p_player_id is not null and exists (
    select 1 from picks
    where draft_id = v_pick.draft_id and player_id = p_player_id and id <> p_pick_id
  ) then
    raise exception 'player already drafted';
  end if;

  update picks
    set player_id = p_player_id,
        status = case when p_player_id is null then 'skipped' else 'made' end,
        made_by_user_id = case when p_player_id is null then null else auth.uid() end,
        made_at = case when p_player_id is null then null else now() end
    where id = p_pick_id
    returning * into v_pick;

  return v_pick;
end;
$$;
