-- Lets a commissioner delete their own draft from the dashboard. Cascades
-- to teams/draft_members/invites/picks/draft_timer via the FKs already
-- declared ON DELETE CASCADE in 0001_init_schema.sql.
create function public.delete_draft(p_draft_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can delete this draft';
  end if;

  delete from drafts where id = p_draft_id;
end;
$$;
