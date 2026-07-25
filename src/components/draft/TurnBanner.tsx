"use client";

import clsx from "clsx";
import { useDraft } from "./DraftProvider";
import { findUpcomingTurn, TURN_WARNING_LEAD } from "@/lib/draft/turn";

/**
 * Copy and colour for each step of the countdown, keyed by how many picks out
 * the team is. The escalation is the message: near-invisible at three picks,
 * amber at two, orange at one, then green for go.
 */
const STAGES: Record<
  number,
  { headline: string; detail: string; tone: string; urgent: boolean }
> = {
  3: {
    headline: "3 picks away",
    detail: "Start shortlisting.",
    tone: "bg-neutral-800 text-white",
    urgent: false,
  },
  2: {
    headline: "2 picks away",
    detail: "Get your pick ready.",
    tone: "bg-amber-400 text-black",
    urgent: false,
  },
  1: {
    headline: "You're up next",
    detail: "One pick to go.",
    tone: "bg-orange-500 text-white",
    urgent: true,
  },
  0: {
    headline: "You're on the clock",
    detail: "Make your selection.",
    tone: "bg-emerald-500 text-white",
    urgent: true,
  },
};

/**
 * The drafting team's own countdown bar, sitting under the nav on every draft
 * screen so it's just as visible from the player pool as from the board.
 *
 * Scoped to people who actually pick: `myTeamId` is null for a commissioner
 * (create_draft inserts their membership without a team) and spectators render
 * a different tree entirely, so both fall out here rather than needing a role
 * check. Renders nothing at all outside the final few picks, so it costs the
 * rest of the draft no vertical space.
 */
export function TurnBanner() {
  const { draft, teams, picks, myTeamId } = useDraft();

  const turn = myTeamId
    ? findUpcomingTurn(picks, myTeamId, draft.currentOverallPick)
    : null;

  // This bar is only the visual countdown now. The draft's audio cues — the
  // opening chime and the final-ten-seconds beeps — play for every profile in
  // the room, team or not, so they live in DraftProvider rather than here.
  if (!turn || turn.picksAway > TURN_WARNING_LEAD) return null;

  const stage = STAGES[turn.picksAway];
  if (!stage) return null;

  const teamName = teams.find((t) => t.id === myTeamId)?.teamName;

  return (
    <div
      role="status"
      // Assertive only once it's actionable: a screen reader shouldn't cut off
      // whatever it's reading to say a pick is still three away.
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
