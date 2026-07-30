-- set_spectator_enabled had no lock at all — the only settings-page control
-- editable after the draft started. Bring it in line with team names/order
-- and invites: commissioner-only, setup-only.
create or replace function public.set_spectator_enabled(p_draft_id uuid, p_enabled boolean)
returns drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft drafts%rowtype;
begin
  select * into v_draft from drafts where id = p_draft_id;
  if v_draft.id is null then
    raise exception 'draft not found';
  end if;

  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can change spectator access';
  end if;

  if v_draft.status <> 'setup' then
    raise exception 'settings are locked once the draft has started';
  end if;

  update drafts set spectator_enabled = p_enabled where id = p_draft_id returning * into v_draft;
  return v_draft;
end;
$$;
