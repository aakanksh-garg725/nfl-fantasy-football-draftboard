import type { Pick, Player, Position, RosterCounts } from "./types";

export interface RosterSlot {
  key: string;
  label: string;
  /** "ANY" (bench) accepts every position; otherwise the slot only accepts these. */
  eligiblePositions: Position[] | "ANY";
}

/**
 * One row per starting slot in league order (QB, RB, WR, TE, then flexes,
 * then K/DST), with bench rows last. Every team shares this same layout —
 * it's the league's roster spec, not a per-team thing.
 */
export function buildRosterSlots(roster: RosterCounts): RosterSlot[] {
  const slots: RosterSlot[] = [];
  const push = (count: number, prefix: string, label: string, eligible: Position[] | "ANY") => {
    for (let i = 1; i <= count; i++) {
      slots.push({ key: `${prefix}-${i}`, label, eligiblePositions: eligible });
    }
  };

  push(roster.qb, "qb", "QB", ["QB"]);
  push(roster.rb, "rb", "RB", ["RB"]);
  push(roster.wr, "wr", "WR", ["WR"]);
  push(roster.te, "te", "TE", ["TE"]);
  push(roster.flexRbWr, "flexrw", "WR/RB", ["RB", "WR"]);
  push(roster.flexWrRbTe, "flexwrt", "WR/RB/TE", ["RB", "WR", "TE"]);
  push(roster.superflex, "sflex", "QB/WR/RB/TE", ["QB", "RB", "WR", "TE"]);
  push(roster.k, "k", "K", ["K"]);
  push(roster.dst, "dst", "DST", ["DST"]);
  push(roster.bench, "bench", "BENCH", "ANY");

  return slots;
}

function slotSpecificity(slot: RosterSlot): number {
  return slot.eligiblePositions === "ANY" ? Infinity : slot.eligiblePositions.length;
}

/**
 * Greedily fills each drafted player into the most specific open slot they're
 * eligible for (a dedicated position slot before a wider flex, a flex before
 * superflex, anything before bench), in the order the picks were made. Purely
 * a display derivation — nothing here enforces what a team is allowed to
 * draft.
 */
export function assignRosterSlots(
  slots: RosterSlot[],
  picksInDraftOrder: { playerId: string; position: Position }[]
): Map<string, string> {
  const assigned = new Map<string, string>();

  for (const pick of picksInDraftOrder) {
    const openSlot = slots
      .filter((s) => !assigned.has(s.key))
      .filter(
        (s) => s.eligiblePositions === "ANY" || s.eligiblePositions.includes(pick.position)
      )
      .sort((a, b) => slotSpecificity(a) - slotSpecificity(b))[0];

    if (openSlot) assigned.set(openSlot.key, pick.playerId);
  }

  return assigned;
}

/** A team's made picks, in the order they were drafted, with position resolved. */
export function teamPicksInDraftOrder(
  teamId: string,
  picks: Pick[],
  playersById: Map<string, Player>
): { playerId: string; position: Position }[] {
  return picks
    .filter((p) => p.teamId === teamId && p.status === "made" && p.playerId)
    .sort((a, b) => a.overallPickNumber - b.overallPickNumber)
    .map((p) => {
      const player = playersById.get(p.playerId as string);
      return player ? { playerId: player.id, position: player.position } : null;
    })
    .filter((x): x is { playerId: string; position: Position } => x !== null);
}
