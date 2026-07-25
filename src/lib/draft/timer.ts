import type { DraftTimerState } from "./types";

/**
 * Derives the displayed remaining seconds from authoritative server state.
 * Every client (in-person screen + each virtual drafter) computes the same
 * value from the same inputs, so no client is ever the source of truth for
 * "how much time is left."
 *
 * @param timer the last-known authoritative timer row
 * @param nowMs client's current time in epoch ms
 * @param clockOffsetMs client clock minus server clock (see useServerClockOffset);
 *   subtracted out so client clock skew never affects the countdown
 */
export function deriveRemainingSeconds(
  timer: Pick<DraftTimerState, "status" | "remainingSeconds" | "startedAt">,
  nowMs: number,
  clockOffsetMs: number
): number {
  if (timer.status !== "running" || !timer.startedAt) {
    return timer.remainingSeconds;
  }
  const serverNowMs = nowMs - clockOffsetMs;
  const startedAtMs = new Date(timer.startedAt).getTime();
  // Floored at zero because a whammy hold (hold_timer_for_whammy, migration
  // 0008) parks started_at in the future: until it passes, elapsed is negative
  // and the countdown should sit frozen at the full duration rather than
  // reading above it.
  const elapsedSeconds = Math.max(
    0,
    Math.floor((serverNowMs - startedAtMs) / 1000)
  );
  return Math.max(0, timer.remainingSeconds - elapsedSeconds);
}

export function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
