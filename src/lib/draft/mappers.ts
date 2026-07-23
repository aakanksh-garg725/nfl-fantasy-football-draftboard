import type {
  DraftMemberRole,
  DraftSettings,
  DraftTeam,
  DraftTimerState,
  Pick,
  PickStatus,
  Player,
  Position,
  TeamByeWeek,
  TimerStatus,
} from "./types";

/** DB rows are snake_case; app types are camelCase. These map one to the other. */

export function mapDraftRow(row: {
  id: string;
  name: string;
  season: number;
  commissioner_id: string;
  status: string;
  team_count: number;
  round_count: number;
  pick_timer_seconds_default: number;
  current_overall_pick: number;
  spectator_enabled: boolean;
}): DraftSettings {
  return {
    id: row.id,
    name: row.name,
    season: row.season,
    commissionerId: row.commissioner_id,
    status: row.status as DraftSettings["status"],
    teamCount: row.team_count as DraftSettings["teamCount"],
    roundCount: row.round_count,
    pickTimerSecondsDefault:
      row.pick_timer_seconds_default as DraftSettings["pickTimerSecondsDefault"],
    currentOverallPick: row.current_overall_pick,
    spectatorEnabled: row.spectator_enabled,
  };
}

export function mapTeamRow(row: {
  id: string;
  draft_id: string;
  slot_number: number;
  team_name: string;
  owner_user_id: string | null;
  team_logo_url: string | null;
}): DraftTeam {
  return {
    id: row.id,
    draftId: row.draft_id,
    slotNumber: row.slot_number,
    teamName: row.team_name,
    ownerUserId: row.owner_user_id,
    teamLogoUrl: row.team_logo_url,
  };
}

export function mapPickRow(row: {
  id: string;
  draft_id: string;
  round: number;
  pick_in_round: number;
  overall_pick_number: number;
  team_id: string;
  player_id: string | null;
  status: string;
  made_by_user_id: string | null;
  made_at: string | null;
}): Pick {
  return {
    id: row.id,
    draftId: row.draft_id,
    round: row.round,
    pickInRound: row.pick_in_round,
    overallPickNumber: row.overall_pick_number,
    teamId: row.team_id,
    playerId: row.player_id,
    status: row.status as PickStatus,
    madeByUserId: row.made_by_user_id,
    madeAt: row.made_at,
  };
}

export function mapTimerRow(row: {
  draft_id: string;
  status: string;
  duration_seconds: number;
  remaining_seconds: number;
  started_at: string | null;
  updated_at: string;
}): DraftTimerState {
  return {
    draftId: row.draft_id,
    status: row.status as TimerStatus,
    durationSeconds: row.duration_seconds,
    remainingSeconds: row.remaining_seconds,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlayerRow(row: {
  id: string;
  full_name: string;
  position: string;
  nfl_team: string | null;
  active: boolean;
  photo_url: string | null;
}): Player {
  return {
    id: row.id,
    fullName: row.full_name,
    position: row.position as Position,
    nflTeam: row.nfl_team,
    active: row.active,
    photoUrl: row.photo_url,
  };
}

export function mapByeWeekRow(row: {
  nfl_team: string;
  season: number;
  bye_week: number;
}): TeamByeWeek {
  return { nflTeam: row.nfl_team, season: row.season, byeWeek: row.bye_week };
}

export interface DraftMemberRow {
  role: DraftMemberRole;
  team_id: string | null;
}
