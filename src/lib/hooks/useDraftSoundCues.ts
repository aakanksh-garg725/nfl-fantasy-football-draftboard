"use client";

import { useEffect, useRef } from "react";
import type { TimerStatus } from "@/lib/draft/types";
import {
  primeDraftStartSound,
  playDraftStartSound,
  playCountdownBeep,
} from "@/lib/draft/draftSounds";

/** How many seconds of runway the final-countdown beep covers, inclusive of 0:10. */
const COUNTDOWN_BEEP_FROM = 10;

/**
 * The draft's room-wide audio cues, played on whatever screen mounts this — a
 * drafter's board, the commissioner's, or the shared spectate display alike, so
 * the whole room hears them together rather than only the team on the clock.
 *
 * Two cues:
 *   - The NFL draft chime, once, the moment the clock first runs on pick 1.
 *   - A short beep on each of the final ten seconds of every pick.
 *
 * Every input is derived from the same authoritative timer/draft state each
 * client already syncs, so no screen is the source of truth for when a cue
 * fires — they all reach the same answer from the same realtime update and
 * sound in step.
 */
export function useDraftSoundCues({
  timerStatus,
  displaySeconds,
  currentOverallPick,
}: {
  timerStatus: TimerStatus;
  displaySeconds: number;
  currentOverallPick: number;
}): void {
  // Buffer the chime up front so a slow connection can't turn the opening sting
  // into a late one.
  useEffect(() => {
    primeDraftStartSound();
  }, []);

  // The opening chime, once per tab. The first pick's clock starting is the one
  // instant every screen agrees is "the start"; the ref keeps a re-render, the
  // sub-second tick, or the pick advancing from replaying it.
  const startPlayedRef = useRef(false);
  useEffect(() => {
    if (
      !startPlayedRef.current &&
      timerStatus === "running" &&
      currentOverallPick === 1
    ) {
      startPlayedRef.current = true;
      void playDraftStartSound();
    }
  }, [timerStatus, currentOverallPick]);

  // One blip per whole second through the final stretch, on every pick. Keyed
  // off the same displaySeconds the clock shows so it can't drift from it;
  // lastBeepSecondRef fires each second exactly once and resets outside the
  // window (or when the clock stops), so the next pick beeps its own countdown.
  const lastBeepSecondRef = useRef<number | null>(null);
  useEffect(() => {
    const inCountdown =
      timerStatus === "running" &&
      displaySeconds >= 1 &&
      displaySeconds <= COUNTDOWN_BEEP_FROM;
    if (!inCountdown) {
      lastBeepSecondRef.current = null;
      return;
    }
    if (lastBeepSecondRef.current !== displaySeconds) {
      lastBeepSecondRef.current = displaySeconds;
      void playCountdownBeep();
    }
  }, [displaySeconds, timerStatus]);
}
