import { generateSnakeOrder } from "./snake";
import type { DraftTeam, Pick, Player } from "./types";

const TEAM_NAMES = [
  "Griffin",
  "Storm",
  "Royals",
  "4EV",
  "Blitz",
  "Pilots",
  "Echo",
  "Hailmary",
  "Titans",
  "Clock",
];

export const MOCK_TEAM_COUNT = 10;
export const MOCK_ROUND_COUNT = 15;

export const mockTeams: DraftTeam[] = TEAM_NAMES.map((name, i) => ({
  id: `team-${i + 1}`,
  draftId: "demo",
  slotNumber: i + 1,
  teamName: name,
  ownerUserId: null,
  teamLogoUrl: null,
}));

const SAMPLE_PLAYERS: Omit<Player, "id">[] = [
  { fullName: "Jahmyr Gibbs", position: "RB", nflTeam: "DET", active: true, photoUrl: null },
  { fullName: "Bijan Robinson", position: "RB", nflTeam: "ATL", active: true, photoUrl: null },
  { fullName: "Puka Nacua", position: "WR", nflTeam: "LAR", active: true, photoUrl: null },
  { fullName: "Ja'Marr Chase", position: "WR", nflTeam: "CIN", active: true, photoUrl: null },
  { fullName: "Jonathan Taylor", position: "RB", nflTeam: "IND", active: true, photoUrl: null },
  { fullName: "Jaxon Smith-Njigba", position: "WR", nflTeam: "SEA", active: true, photoUrl: null },
  { fullName: "Christian McCaffrey", position: "RB", nflTeam: "SF", active: true, photoUrl: null },
  { fullName: "James Cook", position: "RB", nflTeam: "BUF", active: true, photoUrl: null },
  { fullName: "Amon-Ra St. Brown", position: "WR", nflTeam: "DET", active: true, photoUrl: null },
  { fullName: "CeeDee Lamb", position: "WR", nflTeam: "DAL", active: true, photoUrl: null },
  { fullName: "Derrick Henry", position: "RB", nflTeam: "BAL", active: true, photoUrl: null },
  { fullName: "Ashton Jeanty", position: "RB", nflTeam: "LV", active: true, photoUrl: null },
  { fullName: "Patrick Mahomes", position: "QB", nflTeam: "KC", active: true, photoUrl: null },
  { fullName: "Josh Allen", position: "QB", nflTeam: "BUF", active: true, photoUrl: null },
  { fullName: "Travis Kelce", position: "TE", nflTeam: "KC", active: true, photoUrl: null },
  { fullName: "Sam LaPorta", position: "TE", nflTeam: "DET", active: true, photoUrl: null },
  { fullName: "Harrison Butker", position: "K", nflTeam: "KC", active: true, photoUrl: null },
  { fullName: "Justin Tucker", position: "K", nflTeam: "BAL", active: true, photoUrl: null },
  { fullName: "49ers Defense", position: "DST", nflTeam: "SF", active: true, photoUrl: null },
  { fullName: "Cowboys Defense", position: "DST", nflTeam: "DAL", active: true, photoUrl: null },
];

export const mockPlayers: Player[] = SAMPLE_PLAYERS.map((p, i) => ({
  ...p,
  id: `player-${i + 1}`,
}));

export const mockByeWeeksByTeam = new Map<string, number>([
  ["DET", 8], ["ATL", 5], ["LAR", 6], ["CIN", 10], ["IND", 11],
  ["SEA", 8], ["SF", 14], ["BUF", 7], ["DAL", 10], ["BAL", 7],
  ["LV", 8], ["KC", 10],
]);

/** First 12 slots of the snake order filled to mimic the reference screenshot (2 rounds mostly full, currently on 2.3). */
export function buildMockPicks(): Pick[] {
  const slots = generateSnakeOrder(MOCK_TEAM_COUNT, MOCK_ROUND_COUNT);
  const teamBySlot = new Map(mockTeams.map((t) => [t.slotNumber, t]));

  return slots.map((slot) => {
    const team = teamBySlot.get(slot.teamSlotNumber)!;
    const isMade = slot.overallPickNumber <= 12;
    return {
      id: `pick-${slot.overallPickNumber}`,
      draftId: "demo",
      round: slot.round,
      pickInRound: slot.pickInRound,
      overallPickNumber: slot.overallPickNumber,
      teamId: team.id,
      playerId: isMade ? mockPlayers[slot.overallPickNumber - 1]?.id ?? null : null,
      status: isMade ? "made" : "pending",
      madeByUserId: null,
      madeAt: isMade ? new Date().toISOString() : null,
    };
  });
}
