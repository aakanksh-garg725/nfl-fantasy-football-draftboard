-- Additional commissioner-only setup RPCs: invites, team renaming, and the
-- spectator-link toggle. Same pattern as 0002 — no direct table writes.

create function public.create_invite(
  p_draft_id uuid,
  p_team_id uuid,
  p_email text default null
)
returns invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can create invites';
  end if;

  insert into invites (draft_id, team_id, token, email, created_by)
  values (p_draft_id, p_team_id, encode(gen_random_bytes(24), 'hex'), p_email, auth.uid())
  returning * into v_invite;

  return v_invite;
end;
$$;

create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
begin
  select draft_id into v_draft_id from invites where id = p_invite_id;
  if not is_draft_commissioner(v_draft_id) then
    raise exception 'only the commissioner can revoke invites';
  end if;

  update invites set status = 'revoked' where id = p_invite_id;
end;
$$;

create function public.rename_team(p_team_id uuid, p_team_name text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
  v_team teams%rowtype;
begin
  select draft_id into v_draft_id from teams where id = p_team_id;
  if not is_draft_commissioner(v_draft_id) then
    raise exception 'only the commissioner can rename teams';
  end if;

  update teams set team_name = p_team_name where id = p_team_id returning * into v_team;
  return v_team;
end;
$$;

create function public.set_spectator_enabled(p_draft_id uuid, p_enabled boolean)
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
  return v_draft;
end;
$$;
