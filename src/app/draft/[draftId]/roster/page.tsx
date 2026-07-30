"use client";

import { useMemo, useState } from "react";
import { useDraft } from "@/components/draft/DraftProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { RosterBoardGrid } from "@/components/draft/RosterBoardGrid";
import { TimerEditDialog } from "@/components/draft/TimerEditDialog";

export default function RosterPage() {
  const {
    draft,
    teams,
    picks,
    playersById,
    byeWeeksByTeam,
    isCommissioner,
    timerStatus,
    displaySeconds,
    durationSeconds,
    lastError,
    clearError,
    startTimer,
    pauseTimer,
    restartTimer,
    editTimer,
  } = useDraft();

  const isLocked = draft.status === "setup";
  const [showEditTimer, setShowEditTimer] = useState(false);

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => a.overallPickNumber - b.overallPickNumber),
    [picks]
  );
  const currentPick = sortedPicks.find(
    (p) => p.overallPickNumber === draft.currentOverallPick
  );
  const onClockTeam = currentPick
    ? teams.find((t) => t.id === currentPick.teamId)
    : undefined;

  const previousMadePick = [...sortedPicks]
    .reverse()
    .find((p) => p.overallPickNumber < draft.currentOverallPick && p.status === "made");
  const previousPlayer =
    previousMadePick?.playerId ? playersById.get(previousMadePick.playerId) : undefined;
  const previousTeam = previousMadePick
    ? teams.find((t) => t.id === previousMadePick.teamId)
    : undefined;

  const nextUpTeamNames = sortedPicks
    .filter((p) => p.overallPickNumber > draft.currentOverallPick)
    .slice(0, 3)
    .map((p) => teams.find((t) => t.id === p.teamId)?.teamName ?? "");

  return (
    <>
      <TimerHeaderBar
        timerStatus={timerStatus}
        displaySeconds={displaySeconds}
        durationSeconds={durationSeconds}
        round={currentPick?.round ?? draft.roundCount}
        pickInRound={currentPick?.pickInRound ?? draft.teamCount}
        onClockTeamName={onClockTeam?.teamName ?? "Draft complete"}
        nextUpTeamNames={nextUpTeamNames}
        previousPick={
          previousPlayer && previousTeam
            ? { player: previousPlayer, teamName: previousTeam.teamName }
            : null
        }
        isCommissioner={isCommissioner && !isLocked}
        onStart={startTimer}
        onPause={pauseTimer}
        onRestart={restartTimer}
        onEdit={() => setShowEditTimer(true)}
      />

      {lastError && (
        <div className="flex items-center justify-between bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {lastError}
          <button onClick={clearError} className="font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <RosterBoardGrid
          teams={teams}
          roster={draft.roster}
          picks={picks}
          playersById={playersById}
          byeWeeksByTeam={byeWeeksByTeam}
        />
      </div>

      {showEditTimer && (
        <TimerEditDialog
          currentDurationSeconds={durationSeconds}
          onClose={() => setShowEditTimer(false)}
          onConfirm={(seconds) => {
            editTimer(seconds);
            setShowEditTimer(false);
          }}
        />
      )}
    </>
  );
}
