"use client";

import { useSpectateDraft } from "@/components/draft/SpectateProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { DraftBoardGrid } from "@/components/draft/DraftBoardGrid";
import { deriveBoardHeaderInfo } from "@/lib/draft/derivedBoardInfo";

export default function SpectateBoardPage() {
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
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <DraftBoardGrid
          teams={teams}
          roundCount={draft.roundCount}
          picks={picks}
          playersById={playersById}
          byeWeeksByTeam={byeWeeksByTeam}
          currentOverallPick={draft.currentOverallPick}
        />
      </div>
    </>
  );
}
