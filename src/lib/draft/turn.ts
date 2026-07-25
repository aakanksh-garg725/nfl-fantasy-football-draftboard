import type { Pick } from "./types";

/**
 * How many picks out a team starts getting warned. Three is the whole point of
 * the feature — far enough out to go look at the board, close enough that the
 * warning still means something.
 */
export const TURN_WARNING_LEAD = 3;

export interface UpcomingTurn {
  /** 0 when the team is on the clock right now, 1 when they're next, and so on. */
  picksAway: number;
  /** The team's own upcoming pick — its round/pickInRound label the banner shows. */
  pick: Pick;
}

/**
 * The team's next turn, measured in picks from whoever is on the clock.
 *
 * Deliberately keyed off pick *numbers* rather than pick status: a skipped pick
 * still occupies a slot in the order, so counting rows would drift from what
 * the board shows. `currentOverallPick` is the draft's own cursor, so a team
 * owning that exact number is on the clock and lands at 0.
 *
 * Returns null once the team has no picks left at or after the cursor — the end
 * of their draft, and the point the banner should stop appearing entirely.
 */
export function findUpcomingTurn(
  picks: Pick[],
  teamId: string,
  currentOverallPick: number
): UpcomingTurn | null {
  let next: Pick | null = null;

  for (const pick of picks) {
    if (pick.teamId !== teamId) continue;
    if (pick.overallPickNumber < currentOverallPick) continue;
    if (!next || pick.overallPickNumber < next.overallPickNumber) next = pick;
  }

  if (!next) return null;
  return { picksAway: next.overallPickNumber - currentOverallPick, pick: next };
}
