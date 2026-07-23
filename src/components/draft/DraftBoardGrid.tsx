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

  return (
    <div
      className="grid w-full gap-1 p-2"
      style={{
        gridTemplateColumns: `28px repeat(${sortedTeams.length}, minmax(0, 1fr))`,
      }}
    >
      <div />
        {sortedTeams.map((team) => (
          <div
            key={team.id}
            className="truncate rounded-md bg-black/5 px-2 py-1.5 text-center text-xs font-bold tracking-wide uppercase dark:bg-white/10"
          >
            {team.teamName}
          </div>
        ))}

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
          />
        ))}
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
}: {
  round: number;
  teams: DraftTeam[];
  picksByRoundAndTeam: Map<string, Pick>;
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
  currentOverallPick: number;
  onEmptyCellClick?: (pick: Pick) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-center text-sm font-bold text-black/40 dark:text-white/40">
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
