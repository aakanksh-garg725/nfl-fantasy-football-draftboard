"use client";

import { useMemo, useState } from "react";
import { useDraft } from "@/components/draft/DraftProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { AvailablePlayersPanel } from "@/components/draft/AvailablePlayersPanel";
import { TimerEditDialog } from "@/components/draft/TimerEditDialog";

export default function PlayersPage() {
  const {
    draft,
    teams,
    picks,
    playersById,
    byeWeeksByTeam,
    isCommissioner,
    myTeamId,
    timerStatus,
    displaySeconds,
    durationSeconds,
    lastError,
    clearError,
    makePick,
    startTimer,
    pauseTimer,
    restartTimer,
    editTimer,
  } = useDraft();

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

  const draftedPlayerIds = new Set(
    picks.filter((p) => p.status === "made" && p.playerId).map((p) => p.playerId)
  );
  const undraftedPlayers = useMemo(
    () => Array.from(playersById.values()).filter((p) => !draftedPlayerIds.has(p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playersById, picks]
  );

  const canDraft = Boolean(
    currentPick && (isCommissioner || currentPick.teamId === myTeamId)
  );

  return (
    <>
      <TimerHeaderBar
        timerStatus={timerStatus}
        displaySeconds={displaySeconds}
        durationSeconds={durationSeconds}
        round={currentPick?.round ?? draft.roundCount}
        pickNumber={currentPick?.overallPickNumber ?? draft.teamCount * draft.roundCount}
        onClockTeamName={onClockTeam?.teamName ?? "Draft complete"}
        nextUpTeamNames={nextUpTeamNames}
        previousPick={
          previousPlayer && previousTeam
            ? {
                player: previousPlayer,
                byeWeek: previousPlayer.nflTeam
                  ? (byeWeeksByTeam.get(previousPlayer.nflTeam) ?? null)
                  : null,
                teamName: previousTeam.teamName,
              }
            : null
        }
        isCommissioner={isCommissioner}
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

      {!canDraft && currentPick && (
        <div className="bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
          Waiting for {onClockTeam?.teamName} to pick — you can search now, but the draft
          button unlocks on your turn.
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        <AvailablePlayersPanel
          players={undraftedPlayers}
          byeWeeksByTeam={byeWeeksByTeam}
          canDraft={canDraft}
          onDraftPlayer={(playerId) => makePick(playerId)}
        />
      </div>

      {showEditTimer && (
        <TimerEditDialog
          currentDurationSeconds={durationSeconds}
          onClose={() => setShowEditTimer(false)}
          onConfirm={(seconds, applyTo) => {
            editTimer(seconds, applyTo);
            setShowEditTimer(false);
          }}
        />
      )}
    </>
  );
}
