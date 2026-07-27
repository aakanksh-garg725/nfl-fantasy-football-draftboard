"use client";

import { useSpectateDraft } from "@/components/draft/SpectateProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { RosterBoardGrid } from "@/components/draft/RosterBoardGrid";
import { deriveBoardHeaderInfo } from "@/lib/draft/derivedBoardInfo";

export default function SpectateRosterPage() {
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
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <RosterBoardGrid
          teams={teams}
          roster={draft.roster}
          picks={picks}
          playersById={playersById}
          byeWeeksByTeam={byeWeeksByTeam}
        />
      </div>
    </>
  );
}
