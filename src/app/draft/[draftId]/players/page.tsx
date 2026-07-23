"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraft } from "@/components/draft/DraftProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { AvailablePlayersPanel } from "@/components/draft/AvailablePlayersPanel";
import { TimerEditDialog } from "@/components/draft/TimerEditDialog";

export default function PlayersPage() {
  const router = useRouter();
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

  const allPlayers = useMemo(
    () => Array.from(playersById.values()),
    [playersById]
  );
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
        pickInRound={currentPick?.pickInRound ?? draft.teamCount}
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

      <div className="flex min-h-0 flex-1 flex-col p-3">
        <AvailablePlayersPanel
          players={allPlayers}
          byeWeeksByTeam={byeWeeksByTeam}
          draftedByPlayerId={draftedByPlayerId}
          canDraft={canDraft}
          onDraftPlayer={async (playerId) => {
            const ok = await makePick(playerId);
            if (ok) router.push(`/draft/${draft.id}/board`);
          }}
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
