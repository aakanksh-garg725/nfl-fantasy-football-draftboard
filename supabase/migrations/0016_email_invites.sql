-- Replace the copy-a-link invite flow with an email-addressed one: the
-- commissioner enters the email a drafter already signed up with, the
-- invite is resolved to that profile immediately, and it shows up on the
-- invitee's dashboard to accept or decline. The `token` column is kept
-- (still generated, still unique) since nothing depends on removing it, but
-- it's no longer surfaced to the client.

alter table public.invites
  add column invited_user_id uuid references public.profiles (id);

alter table public.invites
  drop constraint invites_status_check;

alter table public.invites
  add constraint invites_status_check
  check (status in ('pending', 'accepted', 'revoked', 'declined'));

-- Tighten select access now that invites carry a resolved recipient: a
-- commissioner needs to see their draft's invites, an invitee needs to see
-- invites addressed to them. (The old "any authenticated user" policy only
-- existed to support the token-link preview page, which this replaces.)
drop policy "authenticated users can look up invites by token" on public.invites;

create policy "commissioners and invitees can read relevant invites"
  on public.invites for select
  to authenticated
  using (
    public.is_draft_commissioner(draft_id)
    or invited_user_id = auth.uid()
  );

-- create_invite now requires an email and resolves it to an existing
-- profile up front — there's no invite to "send" if nobody has signed up
-- with that address yet. Dropped first: CREATE OR REPLACE can't remove a
-- parameter default (p_email used to default to null).
drop function public.create_invite(uuid, uuid, text);

create function public.create_invite(
  p_draft_id uuid,
  p_team_id uuid,
  p_email text
)
returns invites
language plpgsql
security definer
set search_path = public
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

-- list_my_pending_invites — the dashboard's pending-invites section. A plain
-- nested select embed (invites -> drafts/teams) would silently return null
-- for these rows: RLS on drafts/teams only allows reads for existing
-- members, and the whole point is showing this to someone who isn't one
-- yet. Same rationale as get_invite_preview, addressed by identity instead
-- of by token.
create function public.list_my_pending_invites()
returns table (id uuid, draft_name text, team_name text)
language sql
security definer
stable
set search_path = public
as $$
  select i.id, d.name, t.team_name
  from invites i
  join drafts d on d.id = i.draft_id
  join teams t on t.id = i.team_id
  where i.invited_user_id = auth.uid() and i.status = 'pending';
$$;

-- respond_to_invite — the invitee accepts or declines from their dashboard.
-- Mirrors accept_invite's logic but is addressed by invite id + the
-- caller's identity rather than a bearer token.
create function public.respond_to_invite(p_invite_id uuid, p_accept boolean)
returns uuid -- draft_id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to respond to an invite';
  end if;

  if p_accept then
    update invites
      set status = 'accepted', accepted_by = auth.uid()
      where id = p_invite_id
        and invited_user_id = auth.uid()
        and status = 'pending'
        and (expires_at is null or expires_at > now())
      returning * into v_invite;

    if v_invite.id is null then
      raise exception 'invite is invalid, expired, or already used';
    end if;

    update teams set owner_user_id = auth.uid() where id = v_invite.team_id;

    insert into draft_members (draft_id, user_id, role, team_id)
    values (v_invite.draft_id, auth.uid(), 'drafter', v_invite.team_id)
    on conflict (draft_id, user_id) do update
      set role = 'drafter', team_id = excluded.team_id;

    return v_invite.draft_id;
  else
    update invites
      set status = 'declined'
      where id = p_invite_id
        and invited_user_id = auth.uid()
        and status = 'pending'
      returning * into v_invite;

    if v_invite.id is null then
      raise exception 'invite is invalid, expired, or already used';
    end if;

    return null;
  end if;
end;
$$;
