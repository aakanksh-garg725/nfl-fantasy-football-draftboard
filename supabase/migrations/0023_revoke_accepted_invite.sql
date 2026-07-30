-- revoke_invite previously only flipped the invite row to 'revoked', which
-- did nothing once the invite had already been accepted: the team stayed
-- claimed and the drafter stayed a member with no way for the commissioner
-- to undo it short of asking them to leave_draft themselves.
--
-- Now, revoking an accepted invite also vacates the team seat and drops the
-- drafter's membership — the same effect as leave_draft (0009), just
-- triggered by the commissioner instead of the drafter. Still commissioner-
-- only, and now explicitly locked once the draft leaves 'setup', matching
-- every other setup-time control (team names, draft order, invites).
create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_draft drafts%rowtype;
begin
  select * into v_invite from invites where id = p_invite_id;
  if v_invite.id is null then
    raise exception 'invite not found';
  end if;

  if not is_draft_commissioner(v_invite.draft_id) then
    raise exception 'only the commissioner can revoke invites';
  end if;

  select * into v_draft from drafts where id = v_invite.draft_id;
  if v_draft.status <> 'setup' then
    raise exception 'invites are locked once the draft has started';
  end if;

  if v_invite.status = 'accepted' then
    -- Guarded on owner so this only ever clears the seat this invite
    -- actually granted, never one already reassigned some other way.
    update teams
      set owner_user_id = null
      where id = v_invite.team_id and owner_user_id = v_invite.accepted_by;

    delete from draft_members
      where draft_id = v_invite.draft_id and user_id = v_invite.accepted_by;
  end if;

  update invites set status = 'revoked' where id = p_invite_id;
end;
$$;
