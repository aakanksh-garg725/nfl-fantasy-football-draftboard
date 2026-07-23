-- The invite page needs to show the draft/team name *before* the user is a
-- draft_member — but RLS on drafts/teams only allows reads for members (or
-- spectator-enabled drafts), so a plain nested select embed silently returns
-- null for a not-yet-member invitee. This RPC exposes only the minimal
-- preview fields needed, regardless of membership.
create function public.get_invite_preview(p_token text)
returns table (status text, draft_name text, team_name text)
language sql
security definer
stable
set search_path = public
as $$
  select i.status, d.name, t.team_name
  from invites i
  join drafts d on d.id = i.draft_id
  join teams t on t.id = i.team_id
  where i.token = p_token;
$$;
