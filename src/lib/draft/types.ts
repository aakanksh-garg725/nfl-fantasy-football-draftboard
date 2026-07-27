export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export const TEAM_COUNT_OPTIONS = [8, 10, 12, 14, 16] as const;
export type TeamCountOption = (typeof TEAM_COUNT_OPTIONS)[number];

export const TIMER_DURATION_OPTIONS = [120, 90, 60] as const;
export type TimerDurationOption = (typeof TIMER_DURATION_OPTIONS)[number];

export interface RosterCounts {
  qb: number;
  rb: number;
  wr: number;
  te: number;
  flexRbWr: number;
  flexWrRbTe: number;
  superflex: number;
  k: number;
  dst: number;
  bench: number;
}

export const ROSTER_DEFAULTS: RosterCounts = {
  qb: 1,
  rb: 2,
  wr: 2,
  te: 1,
  flexRbWr: 0,
  flexWrRbTe: 1,
  superflex: 0,
  k: 1,
  dst: 1,
  bench: 6,
};

export const ROSTER_FIELDS: {
  key: keyof RosterCounts;
  label: string;
  min: number;
  max?: number;
}[] = [
  { key: "qb", label: "QB", min: 0, max: 4 },
  { key: "rb", label: "RB", min: 0, max: 6 },
  { key: "wr", label: "WR", min: 0, max: 6 },
  { key: "te", label: "TE", min: 0, max: 4 },
  { key: "flexRbWr", label: "WR/RB", min: 0, max: 4 },
  { key: "flexWrRbTe", label: "WR/RB/TE", min: 0, max: 4 },
  { key: "superflex", label: "QB/WR/RB/TE", min: 0, max: 4 },
  { key: "k", label: "K", min: 0, max: 2 },
  { key: "dst", label: "DST", min: 0, max: 2 },
  { key: "bench", label: "Bench", min: 0 },
];

export function totalRosterRounds(roster: RosterCounts): number {
  return (
    roster.qb +
    roster.rb +
    roster.wr +
    roster.te +
    roster.flexRbWr +
    roster.flexWrRbTe +
    roster.superflex +
    roster.k +
    roster.dst +
    roster.bench
  );
}

export type ScoringFormat = "ppr" | "half_ppr" | "non_ppr";

export const SCORING_FORMAT_OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "half_ppr", label: "Half-PPR" },
  { value: "non_ppr", label: "Non-PPR" },
];

export interface Player {
  id: string;
  fullName: string;
  position: Position;
  nflTeam: string | null;
  active: boolean;
  photoUrl: string | null;
}

export interface TeamByeWeek {
  nflTeam: string;
  season: number;
  byeWeek: number;
}

export interface DraftSettings {
  id: string;
  name: string;
  season: number;
  commissionerId: string;
  status: "setup" | "in_progress" | "completed";
  teamCount: TeamCountOption;
  roundCount: number;
  roster: RosterCounts;
  pickTimerSecondsDefault: TimerDurationOption;
  currentOverallPick: number;
  spectatorEnabled: boolean;
  scoringFormat: ScoringFormat;
}

export interface DraftTeam {
  id: string;
  draftId: string;
  slotNumber: number;
  teamName: string;
  ownerUserId: string | null;
  teamLogoUrl: string | null;
}

export type PickStatus = "pending" | "made" | "skipped";

export interface Pick {
  id: string;
  draftId: string;
  round: number;
  pickInRound: number;
  overallPickNumber: number;
  teamId: string;
  playerId: string | null;
  status: PickStatus;
  madeByUserId: string | null;
  madeAt: string | null;
}

export type TimerStatus = "stopped" | "running" | "paused";

export interface DraftTimerState {
  draftId: string;
  status: TimerStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startedAt: string | null;
  updatedAt: string;
}

export type DraftMemberRole = "commissioner" | "drafter";

export interface DraftMember {
  draftId: string;
  userId: string;
  role: DraftMemberRole;
  teamId: string | null;
}

export type InviteStatus = "pending" | "accepted" | "revoked" | "declined";

export interface DraftInvite {
  id: string;
  draftId: string;
  teamId: string;
  email: string | null;
  invitedUserId: string | null;
  status: InviteStatus;
}
