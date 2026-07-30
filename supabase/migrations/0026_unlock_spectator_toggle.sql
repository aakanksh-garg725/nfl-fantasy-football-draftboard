-- 0025_lock_settings_after_start.sql locked set_spectator_enabled to
-- 'setup' along with every other settings-page control. That's wrong for
-- this one specifically: a commissioner running an in-person draft may only
-- realize mid-draft that someone wants to follow along remotely, and the
-- spectate link is read-only — unlike team names, draft order, invites, and
-- roster construction, there's no draft-integrity reason to freeze it once
-- picks are live. Drop the status check; still commissioner-only.
create or replace function public.set_spectator_enabled(p_draft_id uuid, p_enabled boolean)
returns drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can change spectator access';
  end if;

  update drafts set spectator_enabled = p_enabled where id = p_draft_id returning * into v_draft;
  if v_draft.id is null then
    raise exception 'draft not found';
  end if;

  return v_draft;
end;
$$;
