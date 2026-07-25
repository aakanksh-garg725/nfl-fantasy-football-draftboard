-- Holds the next pick's clock while a whammy popup is on screen.
--
-- make_pick/skip_expired_pick both call reset_timer_for_next_pick, which
-- starts the next clock immediately. When the pick being moved to is a round's
-- whammy pick, the dare covers every screen for five seconds — so the team on
-- the clock would otherwise lose those five seconds while nobody is looking at
-- the board.
--
-- Rather than teach the database which picks are whammy picks (that's derived
-- client-side from an editable dare pool in src/lib/draft/whammies.ts), any
-- connected member client that fires the popup calls this. Same pattern as
-- skip_expired_pick: several clients will call it at once and only the first
-- one takes effect.
--
-- The hold works by pushing started_at into the future. deriveRemainingSeconds
-- (src/lib/draft/timer.ts) floors elapsed time at zero, so the countdown sits
-- frozen at the full duration until started_at passes.
create function public.hold_timer_for_whammy(
  p_draft_id uuid,
  p_hold_seconds int
)
returns draft_timer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timer draft_timer%rowtype;
  v_hold int;
begin
  if not is_draft_member(p_draft_id) then
    raise exception 'not a member of this draft';
  end if;

  -- Never let a client name its own number: a whammy hold is a few seconds.
  v_hold := least(greatest(coalesce(p_hold_seconds, 0), 1), 15);

  update draft_timer
    set started_at = now() + make_interval(secs => v_hold),
        updated_at = now()
    where draft_id = p_draft_id
      and status = 'running'
      -- A hold already in effect leaves started_at in the future, so a second
      -- caller matches nothing and the clock can't be extended repeatedly.
      and started_at <= now()
      -- Only a clock that just auto-started. Without this, a client could call
      -- this mid-pick to claw back time it had already burned.
      and now() - started_at < interval '3 seconds'
    returning * into v_timer;

  -- Updating no row is the normal outcome for everyone but the first caller,
  -- so this returns null rather than raising.
  return v_timer;
end;
$$;

-- pause_timer subtracted elapsed time without an upper clamp. With a whammy
-- hold in effect started_at is in the future, making that subtraction negative
-- and handing back *more* time than the pick started with. Clamp to the
-- remaining time already banked.
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
