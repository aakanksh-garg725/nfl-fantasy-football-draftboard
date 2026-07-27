"use client";

import { useMemo } from "react";
import { useSpectateDraft } from "@/components/draft/SpectateProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { AvailablePlayersPanel } from "@/components/draft/AvailablePlayersPanel";
import { deriveBoardHeaderInfo } from "@/lib/draft/derivedBoardInfo";

export default function SpectatePlayersPage() {
  const {
    draft,
    teams,
    picks,
    playersById,
    byeWeeksByTeam,
    timerStatus,
    displaySeconds,
    durationSeconds,
  } = useSpectateDraft();

  const header = deriveBoardHeaderInfo(picks, teams, draft.currentOverallPick, playersById);

  const allPlayers = useMemo(() => Array.from(playersById.values()), [playersById]);
  const draftedByPlayerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of picks) {
      if (p.status === "made" && p.playerId) {
        const team = teams.find((t) => t.id === p.teamId);
        if (team) map.set(p.playerId, team.teamName);
      }
    }
    return map;
  }, [picks, teams]);

  return (
    <>
      <TimerHeaderBar
        timerStatus={timerStatus}
        displaySeconds={displaySeconds}
        durationSeconds={durationSeconds}
        round={header.currentPick?.round ?? draft.roundCount}
        pickInRound={header.currentPick?.pickInRound ?? draft.teamCount}
        onClockTeamName={header.onClockTeamName}
        nextUpTeamNames={header.nextUpTeamNames}
        previousPick={header.previousPick}
        isCommissioner={false}
      />
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <AvailablePlayersPanel
          players={allPlayers}
          byeWeeksByTeam={byeWeeksByTeam}
          draftedByPlayerId={draftedByPlayerId}
          canDraft={false}
        />
      </div>
    </>
  );
}
