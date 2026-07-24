export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export const TEAM_COUNT_OPTIONS = [8, 10, 12, 14, 16] as const;
export type TeamCountOption = (typeof TEAM_COUNT_OPTIONS)[number];

export const TIMER_DURATION_OPTIONS = [120, 90, 60] as const;
export type TimerDurationOption = (typeof TIMER_DURATION_OPTIONS)[number];

export type ScoringFormat = "ppr" | "half_ppr" | "non_ppr";

export const SCORING_FORMAT_OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "half_ppr", label: "Half-PPR" },
  { value: "non_ppr", label: "Non-PPR" },
];

/**
 * Roster construction: starting slots per position plus bench. Purely
 * informational/derived — nothing enforces these limits during the draft,
 * a drafter can fill any pick with any position.
 */
export const ROSTER_SLOTS = [
  { key: "qb", label: "QB", max: 4, default: 1 },
  { key: "rb", label: "RB", max: 6, default: 2 },
  { key: "wr", label: "WR", max: 6, default: 2 },
  { key: "te", label: "TE", max: 4, default: 1 },
  { key: "flexRbWr", label: "FLEX (WR/RB)", max: 4, default: 1 },
  { key: "flexWrRbTe", label: "FLEX (WR/RB/TE)", max: 4, default: 1 },
  { key: "superflex", label: "Superflex (QB/WR/RB/TE)", max: 4, default: 0 },
  { key: "k", label: "K", max: 2, default: 1 },
  { key: "dst", label: "DST", max: 2, default: 1 },
  { key: "bench", label: "Bench", min: 4, max: 8, default: 6 },
] as const;

export type RosterSlotKey = (typeof ROSTER_SLOTS)[number]["key"];
export type RosterCounts = Record<RosterSlotKey, number>;

export const DEFAULT_ROSTER_COUNTS: RosterCounts = Object.fromEntries(
  ROSTER_SLOTS.map((slot) => [slot.key, slot.default])
) as RosterCounts;

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
  rosterCounts: RosterCounts;
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
