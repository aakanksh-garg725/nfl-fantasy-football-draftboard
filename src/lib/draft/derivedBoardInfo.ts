import type { DraftTeam, Pick, Player } from "./types";

export interface PreviousPickInfo {
  player: Player;
  /** The fantasy team that made the pick, not the player's NFL team. */
  teamName: string;
}

export interface BoardHeaderInfo {
  currentPick: Pick | undefined;
  onClockTeamName: string;
  nextUpTeamNames: string[];
  previousPick: PreviousPickInfo | null;
}

/** Shared by every read-only (spectate) board/roster/players header. */
export function deriveBoardHeaderInfo(
  picks: Pick[],
  teams: DraftTeam[],
  currentOverallPick: number,
  playersById: Map<string, Player>
): BoardHeaderInfo {
  const sortedPicks = [...picks].sort((a, b) => a.overallPickNumber - b.overallPickNumber);
  const currentPick = sortedPicks.find((p) => p.overallPickNumber === currentOverallPick);
  const onClockTeam = currentPick ? teams.find((t) => t.id === currentPick.teamId) : undefined;

  const previousMadePick = [...sortedPicks]
    .reverse()
    .find((p) => p.overallPickNumber < currentOverallPick && p.status === "made");
  const previousPlayer = previousMadePick?.playerId
    ? playersById.get(previousMadePick.playerId)
    : undefined;
  const previousTeam = previousMadePick
    ? teams.find((t) => t.id === previousMadePick.teamId)
    : undefined;

  const nextUpTeamNames = sortedPicks
    .filter((p) => p.overallPickNumber > currentOverallPick)
    .slice(0, 3)
    .map((p) => teams.find((t) => t.id === p.teamId)?.teamName ?? "");

  return {
    currentPick,
    onClockTeamName: onClockTeam?.teamName ?? "Draft complete",
    nextUpTeamNames,
    previousPick:
      previousPlayer && previousTeam
        ? { player: previousPlayer, teamName: previousTeam.teamName }
        : null,
  };
}
