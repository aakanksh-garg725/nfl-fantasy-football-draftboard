-- Team names could be renamed at any time, including mid-draft or after
-- completion, even though reorder_teams (0012) already locks draft order to
-- status='setup'. Bring rename_team in line so both team names and draft
-- order freeze together once start_draft (0014) flips the draft out of
-- 'setup'.

create or replace function public.rename_team(p_team_id uuid, p_team_name text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft_id uuid;
  v_draft_status text;
  v_team teams%rowtype;
begin
  select draft_id into v_draft_id from teams where id = p_team_id;
  if not is_draft_commissioner(v_draft_id) then
    raise exception 'only the commissioner can rename teams';
  end if;

  select status into v_draft_status from drafts where id = v_draft_id;
  if v_draft_status <> 'setup' then
    raise exception 'team names can only be changed before the draft starts';
  end if;

  update teams set team_name = p_team_name where id = p_team_id returning * into v_team;
  return v_team;
end;
$$;
