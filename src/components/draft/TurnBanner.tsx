"use client";

import clsx from "clsx";
import { useDraft } from "./DraftProvider";
import { findUpcomingTurn } from "@/lib/draft/turn";

/**
 * Copy and colour for the countdown, keyed by how many picks out the team is.
 * Yellow the entire time a pick is still pending, so the banner never goes
 * quiet mid-draft; red only once there's exactly one pick left to actually
 * force the "get ready now" read; green once it's their own turn.
 */
function stageFor(picksAway: number) {
  if (picksAway === 0) {
    return {
      headline: "You're on the clock",
      detail: "Make your selection.",
      tone: "bg-emerald-500 text-white",
      urgent: true,
    };
  }
  if (picksAway === 1) {
    return {
      headline: "You're up next",
      detail: "One pick to go.",
      tone: "bg-red-500 text-white",
      urgent: true,
    };
  }
  return {
    headline: `${picksAway} picks away`,
    detail: "Get your pick ready.",
    tone: "bg-amber-400 text-black",
    urgent: false,
  };
}

/**
 * The drafting team's own countdown bar, sitting under the nav on every draft
 * screen so it's just as visible from the player pool as from the board.
 *
 * Scoped to people who actually pick: `myTeamId` is null for a commissioner
 * (create_draft inserts their membership without a team) and spectators render
 * a different tree entirely, so both fall out here rather than needing a role
 * check. Shown for the whole draft — from the moment a drafter has a pick
 * pending until they've made every pick they own — so "how many picks until
 * mine" is always on screen, not just in the final stretch.
 */
export function TurnBanner() {
  const { draft, teams, picks, myTeamId } = useDraft();

  const turn = myTeamId
    ? findUpcomingTurn(picks, myTeamId, draft.currentOverallPick)
    : null;

  // This bar is only the visual countdown now. The draft's audio cues — the
  // opening chime and the final-ten-seconds beeps — play for every profile in
  // the room, team or not, so they live in DraftProvider rather than here.
  if (!turn) return null;

  const stage = stageFor(turn.picksAway);

  const teamName = teams.find((t) => t.id === myTeamId)?.teamName;

  return (
    <div
      role="status"
      // Assertive only once it's actionable: a screen reader shouldn't cut off
      // whatever it's reading just to say a pick is still several away.
      aria-live={stage.urgent ? "assertive" : "polite"}
      className={clsx(
        "flex shrink-0 items-center justify-between gap-3 px-4 py-2 text-sm",
        stage.tone
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className={clsx(
            "h-2 w-2 shrink-0 rounded-full bg-current",
            stage.urgent && "animate-pulse"
          )}
        />
        <span className="font-extrabold tracking-wide uppercase">
          {stage.headline}
        </span>
        <span className="truncate opacity-80">{stage.detail}</span>
      </div>

      <span className="shrink-0 text-xs font-semibold opacity-80">
        {teamName ? `${teamName} · ` : ""}Round {turn.pick.round}, Pick{" "}
        {turn.pick.pickInRound}
      </span>
    </div>
  );
}
