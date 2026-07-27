-- Explicit "start draft" step. Previously a draft silently flipped from
-- status='setup' to 'in_progress' on the *first* make_pick call — there was
-- no commissioner gate stopping someone from picking (or starting/editing the
-- timer) before the room was ready. This adds a dedicated start_draft RPC and
-- guards every pick/timer mutation so none of them work until it's been
-- called, matching the client's new pre-draft lock overlay.

create function public.start_draft(p_draft_id uuid)
returns drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can start the draft';
  end if;

  update drafts
    set status = 'in_progress'
    where id = p_draft_id and status = 'setup'
    returning * into v_draft;

  if v_draft.id is null then
    raise exception 'draft has already started';
  end if;

  -- Kicks off the first pick's clock the same way reset_timer_for_next_pick
  -- auto-starts every subsequent one.
  perform reset_timer_for_next_pick(p_draft_id);

  return v_draft;
end;
$$;

create or replace function public.make_pick(p_draft_id uuid, p_player_id text)
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
  select * into v_draft from drafts where id = p_draft_id for update;
  if v_draft.id is null then
    raise exception 'draft not found';
  end if;
  if v_draft.status = 'setup' then
    raise exception 'draft has not started yet';
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

create or replace function public.skip_expired_pick(p_draft_id uuid)
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
  if v_draft.status = 'setup' then
    raise exception 'draft has not started yet';
  end if;

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

create or replace function public.commissioner_edit_pick(p_pick_id uuid, p_player_id text)
returns picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pick picks%rowtype;
  v_draft_status text;
begin
  select * into v_pick from picks where id = p_pick_id;
  if v_pick.id is null then
    raise exception 'pick not found';
  end if;
  if not is_draft_commissioner(v_pick.draft_id) then
    raise exception 'only the commissioner can edit picks';
  end if;

  select status into v_draft_status from drafts where id = v_pick.draft_id;
  if v_draft_status = 'setup' then
    raise exception 'draft has not started yet';
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

create or replace function public.start_timer(p_draft_id uuid)
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
  if (select status from drafts where id = p_draft_id) = 'setup' then
    raise exception 'draft has not started yet';
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

create or replace function public.pause_timer(p_draft_id uuid)
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
  if (select status from drafts where id = p_draft_id) = 'setup' then
    raise exception 'draft has not started yet';
  end if;

  update draft_timer
    set remaining_seconds = greatest(
          0,
          least(
            remaining_seconds,
            remaining_seconds - floor(extract(epoch from (now() - started_at)))::int
          )
        ),
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

create or replace function public.restart_timer(p_draft_id uuid)
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
  if (select status from drafts where id = p_draft_id) = 'setup' then
    raise exception 'draft has not started yet';
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

create or replace function public.edit_timer(
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
  if (select status from drafts where id = p_draft_id) = 'setup' then
    raise exception 'draft has not started yet';
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
