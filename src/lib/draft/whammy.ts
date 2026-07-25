import { WHAMMY_DARES } from "./whammies";

export interface RoundWhammy {
  /** The round that just finished. */
  round: number;
  /**
   * Overall pick number the whammy fires on — the first pick of the *next*
   * round, since arriving there is what marks `round` as complete.
   */
  overallPickNumber: number;
  /** 1-indexed team draft slot on the hook (join against `teams.slotNumber`). */
  teamSlotNumber: number;
  dare: string;
}

/** FNV-1a. Small, dependency-free, and stable across browsers/runtimes. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a seeded PRNG, so a given seed always yields the same run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The whammy for one round: who it lands on, which dare it draws, and the pick
 * whose arrival ends the round and therefore fires it.
 *
 * Derived purely from the draft id and round number rather than stored, so
 * every client computes an identical answer with no extra table, RPC, or
 * broadcast — the existing realtime sync on `currentOverallPick` is enough to
 * make the popup land on all screens at once. It also means a refresh can
 * never reroll a round's whammy.
 *
 * Returns null if the dare pool has been emptied.
 */
export function whammyForRound(
  draftId: string,
  round: number,
  teamCount: number
): RoundWhammy | null {
  if (WHAMMY_DARES.length === 0) return null;
  if (teamCount <= 0 || round < 1) return null;

  const random = mulberry32(hashString(`${draftId}:whammy:${round}`));

  const teamSlotNumber = 1 + Math.floor(random() * teamCount);
  const dare = WHAMMY_DARES[Math.floor(random() * WHAMMY_DARES.length)];

  return {
    round,
    // One past the round's last pick. For the final round that's one past the
    // whole draft, which is exactly where `current_overall_pick` lands when the
    // last pick is made — so the closing round gets its whammy too.
    overallPickNumber: round * teamCount + 1,
    teamSlotNumber,
    dare,
  };
}

/**
 * The whammy that fires exactly when the draft arrives at `overallPickNumber`,
 * or null if no round ends there.
 */
export function whammyAtOverallPick(
  draftId: string,
  overallPickNumber: number,
  teamCount: number
): RoundWhammy | null {
  if (teamCount <= 0 || overallPickNumber < 1) return null;

  // Whammies land on round boundaries, so only the first pick of a round can be
  // one — and the draft's very first pick ends no round.
  if ((overallPickNumber - 1) % teamCount !== 0) return null;
  const completedRound = (overallPickNumber - 1) / teamCount;
  if (completedRound < 1) return null;

  return whammyForRound(draftId, completedRound, teamCount);
}
