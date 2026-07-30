"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDraft } from "./DraftProvider";
import { positionAccentColor } from "@/lib/draft/positionStyle";
import { splitPlayerName } from "@/lib/draft/playerName";
import type { DraftTeam, Pick, Player } from "@/lib/draft/types";

/**
 * How many selections the ticker holds.
 *
 * It's a "what just happened" strip, not an archive — the board above already
 * shows every pick of the draft, laid out by round and team. Capping it keeps
 * one lap of the rotation short enough to be worth waiting through.
 */
const MAX_ENTRIES = 20;

/**
 * Rotation speed. Fixed in pixels per second rather than as a fixed lap time so
 * the ticker reads at the same pace all draft long — a lap timed to look right
 * at four picks would be a blur at twenty.
 */
const SCROLL_PX_PER_SECOND = 60;

interface TickerEntry {
  pick: Pick;
  player: Player;
  team: DraftTeam;
}

/**
 * The broadcast-style selection ticker along the bottom of the board: the most
 * recent pick leads, and the strip rotates left to right the way a draft-night
 * lower third does.
 *
 * Rotation only kicks in when the picks actually overflow the strip — early in
 * a draft, four selections sit still rather than drifting across a mostly empty
 * bar with a visible gap chasing them.
 *
 * The scroll offset lives in a ref and is advanced every frame by a
 * requestAnimationFrame loop, rather than as a CSS animation whose duration is
 * recomputed from content width. A new pick changes that width, and a CSS
 * animation restarts from 0% the instant its duration changes — so every pick
 * would snap the strip back to the start. Driving position from an
 * ever-incrementing ref sidesteps that: new entries append to the run, the
 * loop keeps reading the same offset it was at, and motion never resets.
 */
export function RecentPicksTicker() {
  const { picks, teams, playersById } = useDraft();

  const entries = useMemo<TickerEntry[]>(() => {
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    return picks
      .filter((p) => p.status === "made" && p.playerId)
      // Newest first to pick the window, then flipped back into draft order so
      // the strip reads oldest -> newest with the latest selection trailing.
      .sort((a, b) => b.overallPickNumber - a.overallPickNumber)
      .slice(0, MAX_ENTRIES)
      .reverse()
      .map((pick) => ({
        pick,
        player: playersById.get(pick.playerId as string),
        team: teamsById.get(pick.teamId),
      }))
      // A pick can outrun its lookups: realtime delivers the row, but a player
      // trimmed from the pool or a team removed mid-setup leaves nothing to
      // render. Dropping the entry beats a chip with blank text in it.
      .filter(
        (e): e is TickerEntry => Boolean(e.player) && Boolean(e.team)
      );
  }, [picks, teams, playersById]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const [rotating, setRotating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Pixels scrolled so far. Deliberately outside React state — it must survive
  // re-renders untouched (including the ones triggered by a new pick) so the
  // strip never jumps back to translateX(0).
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Measured rather than guessed from the entry count: chip width is fixed but
  // the strip's own width isn't, so whether the picks overflow depends on the
  // window. Re-runs on resize via the observer, and on every new pick via deps
  // — but only ever flips a boolean, never touches offsetRef.
  useEffect(() => {
    const viewport = viewportRef.current;
    const run = runRef.current;
    if (!viewport || !run) return;

    const measure = () => {
      setRotating(!reducedMotion && run.scrollWidth > viewport.clientWidth);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(run);
    return () => observer.disconnect();
  }, [entries, reducedMotion]);

  // The actual motion. Starts/stops only when `rotating` flips, so a steady
  // stream of new picks — the common case once the strip overflows — never
  // interrupts this effect or the offset it's carrying forward.
  useEffect(() => {
    if (!rotating) return;
    const track = trackRef.current;
    const run = runRef.current;
    if (!track || !run) return;

    let frameId: number;
    let lastTime: number | null = null;

    const step = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      if (!pausedRef.current) {
        // One "lap" is the width of a single (non-duplicated) run. Wrapping
        // here, rather than at the doubled track width, keeps the modulo
        // cheap and correct even as new picks extend the run.
        const lapWidth = run.scrollWidth;
        offsetRef.current = (offsetRef.current + (SCROLL_PX_PER_SECOND * dt) / 1000) % lapWidth;
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }

      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [rotating]);

  // Nothing has happened yet — don't spend a strip of the board saying so.
  if (entries.length === 0) return null;

  return (
    <div className="flex shrink-0 items-stretch border-t border-white/10 bg-neutral-900 text-white">
      {/* The station bug: fixed on the left while the picks rotate past it. */}
      <div className="flex shrink-0 items-center border-r border-white/10 px-3">
        <span className="text-[10px] leading-tight font-extrabold tracking-wider text-white/50 uppercase">
          Recent
          <br />
          Picks
        </span>
      </div>

      <div
        ref={viewportRef}
        className="min-w-0 flex-1"
        style={{ overflow: reducedMotion ? "auto" : "hidden" }}
        onMouseEnter={() => {
          pausedRef.current = true;
        }}
        onMouseLeave={() => {
          pausedRef.current = false;
        }}
      >
        <div ref={trackRef} className="flex w-max">
          <div ref={runRef} className="flex gap-10 pr-10">
            {entries.map((entry) => (
              <TickerChip key={entry.pick.id} entry={entry} />
            ))}
          </div>

          {/* Second lap, trailing the first so the loop has something to hand
              over to at the seam. Hidden from assistive tech — it's the same
              picks a second time, which is a visual trick, not information. */}
          {rotating && (
            <div aria-hidden className="flex gap-10 pr-10">
              {entries.map((entry) => (
                <TickerChip key={entry.pick.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TickerChip({ entry }: { entry: TickerEntry }) {
  const { pick, player, team } = entry;
  const name = splitPlayerName(player.fullName);

  return (
    <div className="flex w-44 shrink-0 items-center gap-2 py-2">
      {/* Position colour as a stripe rather than a fill: at this size a tinted
          chip would fight the text, but the stripe still lets you read the run
          of positions along the ticker at a glance. */}
      <span
        aria-hidden
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: positionAccentColor(player.position) }}
      />

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 text-[10px] leading-tight">
          <span className="font-mono font-bold text-white/70 tabular-nums">
            {pick.round}.{String(pick.pickInRound).padStart(2, "0")}
          </span>
          <span className="truncate font-semibold text-white/50 uppercase">
            {team.teamName}
          </span>
        </div>

        <div className="truncate text-sm leading-tight font-bold">
          {name.first && (
            <span className="font-normal opacity-70">{name.first} </span>
          )}
          {name.last}
        </div>

        <div className="truncate text-[10px] leading-tight font-semibold text-white/50">
          {player.position}
          {player.nflTeam ? ` · ${player.nflTeam}` : ""}
        </div>
      </div>
    </div>
  );
}
