"use client";

import { useEffect, useRef } from "react";
import type { DraftTeam, Pick, Player } from "@/lib/draft/types";
import { PlayerCard } from "./PlayerCard";
import { EmptyPickCell } from "./EmptyPickCell";

export interface DraftBoardGridProps {
  teams: DraftTeam[];
  roundCount: number;
  picks: Pick[];
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
  currentOverallPick: number;
  onEmptyCellClick?: (pick: Pick) => void;
}

export function DraftBoardGrid({
  teams,
  roundCount,
  picks,
  playersById,
  byeWeeksByTeam,
  currentOverallPick,
  onEmptyCellClick,
}: DraftBoardGridProps) {
  const picksByRoundAndTeam = new Map<string, Pick>();
  for (const pick of picks) {
    picksByRoundAndTeam.set(`${pick.round}:${pick.teamId}`, pick);
  }

  const sortedTeams = [...teams].sort((a, b) => a.slotNumber - b.slotNumber);
  const rounds = Array.from({ length: roundCount }, (_, i) => i + 1);
  const columnTemplate = `28px repeat(${sortedTeams.length}, minmax(0, 1fr))`;

  // Keeps the round currently on the clock in view without anyone having to
  // scroll for it — `block: "nearest"` is a no-op if it's already visible, so
  // this never yanks the view away from someone who's scrolled elsewhere to
  // review earlier rounds while their row is still fully on screen.
  const currentRound = picks.find(
    (p) => p.overallPickNumber === currentOverallPick
  )?.round;
  const currentRoundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentRoundRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentOverallPick]);

  return (
    <div className="w-full px-2 pb-2">
      {/* One continuous, opaque bar — not per-cell backgrounds — so there's
          no seam for a scrolled-past round to show through, either between
          team names or in the space above them. Its own mini-grid mirrors
          the body grid's column template so names land exactly above their
          column; pt-5 replaces the top padding this used to share with the
          scroll container (board/page.tsx's p-3), now folded into this one
          painted box instead of sitting outside it. */}
      <div className="sticky top-0 z-10 bg-[var(--background)] pt-5 pb-1">
        <div className="grid gap-1" style={{ gridTemplateColumns: columnTemplate }}>
          <div />
          {sortedTeams.map((team) => (
            <div
              key={team.id}
              className="truncate rounded-md bg-black/5 px-2 py-1.5 text-center text-xs font-bold tracking-wide uppercase dark:bg-white/10"
            >
              {team.teamName}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: columnTemplate }}>
        {rounds.map((round) => (
          <RoundRow
            key={round}
            round={round}
            teams={sortedTeams}
            picksByRoundAndTeam={picksByRoundAndTeam}
            playersById={playersById}
            byeWeeksByTeam={byeWeeksByTeam}
            currentOverallPick={currentOverallPick}
            onEmptyCellClick={onEmptyCellClick}
            roundLabelRef={round === currentRound ? currentRoundRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function RoundRow({
  round,
  teams,
  picksByRoundAndTeam,
  playersById,
  byeWeeksByTeam,
  currentOverallPick,
  onEmptyCellClick,
  roundLabelRef,
}: {
  round: number;
  teams: DraftTeam[];
  picksByRoundAndTeam: Map<string, Pick>;
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
  currentOverallPick: number;
  onEmptyCellClick?: (pick: Pick) => void;
  /** Set only on the round currently on the clock — see the scrollIntoView effect above. */
  roundLabelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <div
        ref={roundLabelRef}
        className="flex items-center justify-center text-sm font-bold text-black/40 dark:text-white/40"
      >
        {round}
      </div>
      {teams.map((team) => {
        const pick = picksByRoundAndTeam.get(`${round}:${team.id}`);
        if (!pick) return <div key={team.id} />;

        if (pick.status === "made" && pick.playerId) {
          const player = playersById.get(pick.playerId);
          if (!player) return <div key={team.id} />;
          const byeWeek = player.nflTeam
            ? (byeWeeksByTeam.get(player.nflTeam) ?? null)
            : null;
          return (
            <PlayerCard key={team.id} player={player} byeWeek={byeWeek} />
          );
        }

        return (
          <EmptyPickCell
            key={team.id}
            round={round}
            pickInRound={pick.pickInRound}
            status={pick.status}
            isCurrent={pick.overallPickNumber === currentOverallPick}
            onClick={
              onEmptyCellClick ? () => onEmptyCellClick(pick) : undefined
            }
          />
        );
      })}
    </>
  );
}
