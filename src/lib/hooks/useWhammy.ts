"use client";

import { useCallback, useEffect, useState } from "react";
import { whammyAtOverallPick } from "@/lib/draft/whammy";
import type { DraftTeam } from "@/lib/draft/types";

/** How long the whammy popup stays on screen. */
export const WHAMMY_VISIBLE_MS = 5000;

export interface ActiveWhammy {
  dare: string;
  teamName: string;
  round: number;
}

export interface WhammyState {
  whammy: ActiveWhammy | null;
  /** Clears the popup early; the five-second timeout is the fallback, not the only exit. */
  dismiss: () => void;
}

/**
 * Fires the end-of-round whammy popup.
 *
 * Watches the realtime-synced `currentOverallPick`; when the draft crosses
 * into a new round, the dare for the round that just finished shows for five
 * seconds. Because the whammy is derived (see lib/draft/whammy.ts) rather than
 * stored, every client reacts to the same realtime event with the same answer
 * and the popup lands on all screens together.
 *
 * Seeding `seenPick` with the current pick means a whammy only ever fires on
 * an actual advance, never on mount — otherwise refreshing on the first pick
 * of a round would replay the dare, and anyone joining late would get a stale
 * one.
 */
export function useWhammy({
  draftId,
  currentOverallPick,
  teams,
}: {
  draftId: string;
  currentOverallPick: number;
  teams: DraftTeam[];
}): WhammyState {
  const [state, setState] = useState<{
    seenPick: number;
    active: ActiveWhammy | null;
  }>(() => ({ seenPick: currentOverallPick, active: null }));

  // Derived during render rather than in an effect: the popup is a pure
  // function of the pick the draft just moved to, and going through an effect
  // would render once without it and then immediately again with it.
  if (state.seenPick !== currentOverallPick) {
    const whammy = whammyAtOverallPick(draftId, currentOverallPick, teams.length);
    const team = whammy
      ? teams.find((t) => t.slotNumber === whammy.teamSlotNumber)
      : undefined;

    setState({
      seenPick: currentOverallPick,
      active:
        whammy && team
          ? { dare: whammy.dare, teamName: team.teamName, round: whammy.round }
          : null,
    });
  }

  const active = state.active;

  // `seenPick` is left alone so a dismissed whammy can't re-fire for the same
  // pick — only the visible popup is cleared.
  const dismiss = useCallback(
    () => setState((prev) => (prev.active ? { ...prev, active: null } : prev)),
    []
  );

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(dismiss, WHAMMY_VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [active, dismiss]);

  return { whammy: active, dismiss };
}
