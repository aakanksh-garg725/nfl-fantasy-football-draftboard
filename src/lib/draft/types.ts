export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export const TEAM_COUNT_OPTIONS = [8, 10, 12, 14, 16] as const;
export type TeamCountOption = (typeof TEAM_COUNT_OPTIONS)[number];

export const ROUND_COUNT_MIN = 15;
export const ROUND_COUNT_MAX = 20;

export const TIMER_DURATION_OPTIONS = [120, 90, 60] as const;
export type TimerDurationOption = (typeof TIMER_DURATION_OPTIONS)[number];

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
