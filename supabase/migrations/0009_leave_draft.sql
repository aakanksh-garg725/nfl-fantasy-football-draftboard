-- Lets a drafter remove themselves from a draft they were invited to. Vacates
-- their team seat (owner_user_id -> null) so the commissioner can re-invite it,
-- and drops their membership row. Any picks the team already made stay put —
-- they belong to the team, not the person who was sitting in it.
--
-- Commissioners can't leave (that would orphan the draft); they delete it
-- instead (see 0007_delete_draft.sql). SECURITY DEFINER so the member can clear
-- their own row and seat without a direct table grant, same pattern as the
-- other RPCs.
create function public.leave_draft(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member draft_members%rowtype;
begin
  select * into v_member
  from draft_members
  where draft_id = p_draft_id and user_id = auth.uid();

  if v_member.id is null then
    raise exception 'you are not a member of this draft';
  end if;

  if v_member.role = 'commissioner' then
    raise exception 'the commissioner cannot leave a draft; delete it instead';
  end if;

  -- Open the seat back up. Guarded on owner so we only ever clear our own claim,
  -- never a seat that has already been reassigned.
  if v_member.team_id is not null then
    update teams
      set owner_user_id = null
      where id = v_member.team_id and owner_user_id = auth.uid();
  end if;

  delete from draft_members where id = v_member.id;
end;
$$;
