-- 0016_email_invites.sql's rewrite of create_invite dropped the `extensions`
-- schema from search_path that 0004 had added specifically so the
-- unqualified gen_random_bytes call resolves (pgcrypto lives in
-- `extensions`, not `public`, on Supabase). Restore it.
create or replace function public.create_invite(
  p_draft_id uuid,
  p_team_id uuid,
  p_email text
)
returns invites
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_invite invites%rowtype;
  v_invited_user_id uuid;
begin
  if not is_draft_commissioner(p_draft_id) then
    raise exception 'only the commissioner can create invites';
  end if;

  select id into v_invited_user_id from profiles where lower(email) = lower(trim(p_email));
  if v_invited_user_id is null then
    raise exception 'no account found for that email — ask them to sign up first';
  end if;

  insert into invites (draft_id, team_id, token, email, invited_user_id, created_by)
  values (
    p_draft_id, p_team_id, encode(gen_random_bytes(24), 'hex'),
    lower(trim(p_email)), v_invited_user_id, auth.uid()
  )
  returning * into v_invite;

  return v_invite;
end;
$$;
