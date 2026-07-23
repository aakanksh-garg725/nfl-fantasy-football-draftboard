-- NFL Fantasy Draftboard — core schema.
-- All client writes to drafts/teams/draft_members/picks/draft_timer go
-- through the SECURITY DEFINER RPCs in 0002_rpc_functions.sql — there are
-- deliberately no direct INSERT/UPDATE policies for those tables below.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create a profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- drafts
-- ---------------------------------------------------------------------------
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  season int not null,
  commissioner_id uuid not null references public.profiles (id),
  status text not null default 'setup'
    check (status in ('setup', 'in_progress', 'completed')),
  team_count int not null check (team_count in (8, 10, 12, 14, 16)),
  round_count int not null check (round_count between 15 and 20),
  pick_timer_seconds_default int not null
    check (pick_timer_seconds_default in (60, 90, 120)),
  current_overall_pick int not null default 1,
  spectator_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.drafts enable row level security;

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  slot_number int not null,
  team_name text not null,
  owner_user_id uuid references public.profiles (id),
  team_logo_url text,
  created_at timestamptz not null default now(),
  unique (draft_id, slot_number)
);

alter table public.teams enable row level security;

-- ---------------------------------------------------------------------------
-- draft_members — per-draft role, scoped separately from global identity
-- ---------------------------------------------------------------------------
create table public.draft_members (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  role text not null check (role in ('commissioner', 'drafter')),
  team_id uuid references public.teams (id),
  created_at timestamptz not null default now(),
  unique (draft_id, user_id)
);

alter table public.draft_members enable row level security;

-- Helper (SECURITY DEFINER to avoid RLS self-recursion on draft_members).
create function public.is_draft_member(p_draft_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.draft_members
    where draft_id = p_draft_id and user_id = auth.uid()
  );
$$;

create function public.is_draft_commissioner(p_draft_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.draft_members
    where draft_id = p_draft_id and user_id = auth.uid() and role = 'commissioner'
  );
$$;

create function public.is_spectator_open(p_draft_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select spectator_enabled from public.drafts where id = p_draft_id),
    false
  );
$$;

-- Now that the helpers exist, add the read policies that depend on them.

create policy "members or spectators can read a draft"
  on public.drafts for select
  to authenticated, anon
  using (public.is_draft_member(id) or public.is_spectator_open(id));

create policy "members or spectators can read teams"
  on public.teams for select
  to authenticated, anon
  using (public.is_draft_member(draft_id) or public.is_spectator_open(draft_id));

create policy "members can read their own draft's membership list"
  on public.draft_members for select
  to authenticated
  using (public.is_draft_member(draft_id));

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  token text not null unique,
  email text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid not null references public.profiles (id),
  accepted_by uuid references public.profiles (id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- Any authenticated user may look up an invite by its (unguessable) token,
-- so the accept-invite page can render before they have a draft_members row.
create policy "authenticated users can look up invites by token"
  on public.invites for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- players (imported from Sleeper; DST rows are synthesized) — public reference data
-- ---------------------------------------------------------------------------
create table public.players (
  id text primary key,
  full_name text not null,
  position text not null check (position in ('QB', 'RB', 'WR', 'TE', 'K', 'DST')),
  nfl_team text,
  active boolean not null default true,
  photo_url text,
  metadata jsonb,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "players are publicly readable"
  on public.players for select
  to authenticated, anon
  using (true);

-- ---------------------------------------------------------------------------
-- team_bye_weeks — public reference data
-- ---------------------------------------------------------------------------
create table public.team_bye_weeks (
  nfl_team text not null,
  season int not null,
  bye_week int not null check (bye_week between 1 and 18),
  primary key (nfl_team, season)
);

alter table public.team_bye_weeks enable row level security;

create policy "bye weeks are publicly readable"
  on public.team_bye_weeks for select
  to authenticated, anon
  using (true);

-- ---------------------------------------------------------------------------
-- picks — full skeleton generated at draft creation (see create_draft RPC)
-- ---------------------------------------------------------------------------
create table public.picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  round int not null,
  pick_in_round int not null,
  overall_pick_number int not null,
  team_id uuid not null references public.teams (id),
  player_id text references public.players (id),
  status text not null default 'pending'
    check (status in ('pending', 'made', 'skipped')),
  made_by_user_id uuid references public.profiles (id),
  made_at timestamptz,
  created_at timestamptz not null default now(),
  unique (draft_id, overall_pick_number)
);

-- A player can never be attached to two picks in the same draft.
create unique index picks_draft_player_unique
  on public.picks (draft_id, player_id)
  where player_id is not null;

create index picks_draft_round_idx on public.picks (draft_id, round);

alter table public.picks enable row level security;

create policy "members or spectators can read picks"
  on public.picks for select
  to authenticated, anon
  using (public.is_draft_member(draft_id) or public.is_spectator_open(draft_id));

-- ---------------------------------------------------------------------------
-- draft_timer — one authoritative row per draft
-- ---------------------------------------------------------------------------
create table public.draft_timer (
  draft_id uuid primary key references public.drafts (id) on delete cascade,
  status text not null default 'stopped'
    check (status in ('stopped', 'running', 'paused')),
  duration_seconds int not null,
  remaining_seconds int not null,
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

alter table public.draft_timer enable row level security;

create policy "members or spectators can read the timer"
  on public.draft_timer for select
  to authenticated, anon
  using (public.is_draft_member(draft_id) or public.is_spectator_open(draft_id));
