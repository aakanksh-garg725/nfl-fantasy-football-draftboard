-- Supabase installs pgcrypto (gen_random_bytes) into the `extensions`
-- schema, not `public`. create_invite's search_path only included `public`,
-- so the unqualified call to gen_random_bytes failed with 42883.
create or replace function public.create_invite(
  p_draft_id uuid,
  p_team_id uuid,
  p_email text default null
)
returns invites
language plpgsql
security definer
set search_path = public, extensions
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
