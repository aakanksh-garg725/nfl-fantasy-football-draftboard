import type { Pick } from "./types";

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

/**
 * A team's own skipped pick still waiting to be filled in, if it has one.
 *
 * The draft's cursor already moved past a skipped pick the moment it was
 * skipped, so the team is never "on the clock" for it again — this is the
 * only way the search bar / player pool know to route a drafter's next
 * selection into that old slot instead of expecting them to be up next.
 * Oldest first, in case a team somehow racks up more than one.
 */
export function findOwnSkippedPick(picks: Pick[], teamId: string): Pick | null {
  let earliest: Pick | null = null;

  for (const pick of picks) {
    if (pick.teamId !== teamId || pick.status !== "skipped") continue;
    if (!earliest || pick.overallPickNumber < earliest.overallPickNumber) earliest = pick;
  }

  return earliest;
}
