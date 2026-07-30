import { Fragment } from "react";
import type { DraftTeam, Pick, Player, RosterCounts } from "@/lib/draft/types";
import { assignRosterSlots, buildRosterSlots, teamPicksInDraftOrder } from "@/lib/draft/roster";
import { PlayerCard } from "./PlayerCard";

export interface RosterBoardGridProps {
  teams: DraftTeam[];
  roster: RosterCounts;
  picks: Pick[];
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
}

export function RosterBoardGrid({
  teams,
  roster,
  picks,
  playersById,
  byeWeeksByTeam,
}: RosterBoardGridProps) {
  const sortedTeams = [...teams].sort((a, b) => a.slotNumber - b.slotNumber);
  const slots = buildRosterSlots(roster);

  const assignedByTeam = new Map(
    sortedTeams.map((team) => [
      team.id,
      assignRosterSlots(slots, teamPicksInDraftOrder(team.id, picks, playersById)),
    ])
  );

  const columnTemplate = `72px repeat(${sortedTeams.length}, minmax(0, 1fr))`;

  return (
    <div className="w-full px-2 pb-2">
      {/* One continuous, opaque bar — not per-cell backgrounds — so there's
          no seam for a scrolled-past roster row to show through, either
          between team names or in the space above them. See DraftBoardGrid's
          matching header for the full rationale. */}
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
        {slots.map((slot) => (
          <Fragment key={slot.key}>
            <div className="flex items-center justify-center text-center text-xs font-bold text-black/40 dark:text-white/40">
              {slot.label}
            </div>
            {sortedTeams.map((team) => {
              const playerId = assignedByTeam.get(team.id)?.get(slot.key);
              const player = playerId ? playersById.get(playerId) : undefined;

              if (player) {
                const byeWeek = player.nflTeam
                  ? (byeWeeksByTeam.get(player.nflTeam) ?? null)
                  : null;
                return (
                  <PlayerCard
                    key={`${slot.key}-${team.id}`}
                    player={player}
                    byeWeek={byeWeek}
                  />
                );
              }

              return (
                <div
                  key={`${slot.key}-${team.id}`}
                  className="flex h-20 w-full items-center justify-center rounded-lg border border-black/5 bg-black/5 text-xs font-bold tracking-wide text-black/30 uppercase dark:border-white/5 dark:bg-white/5 dark:text-white/25"
                >
                  {slot.label}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
