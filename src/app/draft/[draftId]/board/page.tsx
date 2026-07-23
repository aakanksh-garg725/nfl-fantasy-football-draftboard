"use client";

import { useMemo, useState } from "react";
import { useDraft } from "@/components/draft/DraftProvider";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { DraftBoardGrid } from "@/components/draft/DraftBoardGrid";
import { AvailablePlayersPanel } from "@/components/draft/AvailablePlayersPanel";
import { TimerEditDialog } from "@/components/draft/TimerEditDialog";
import { Modal } from "@/components/ui/Modal";
import type { Pick } from "@/lib/draft/types";

export default function BoardPage() {
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
    makePick,
    commissionerEditPick,
    startTimer,
    pauseTimer,
    restartTimer,
    editTimer,
  } = useDraft();

  const [editingPick, setEditingPick] = useState<Pick | null>(null);
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

  async function handleEmptyCellClick(pick: Pick) {
    if (!isCommissioner) return;
    setEditingPick(pick);
  }

  async function handleSelectPlayerForEditingPick(playerId: string) {
    if (!editingPick) return;
    const isCurrent = editingPick.overallPickNumber === draft.currentOverallPick;
    const ok = isCurrent
      ? await makePick(playerId)
      : await commissionerEditPick(editingPick.id, playerId);
    if (ok) setEditingPick(null);
  }

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

      <div className="flex-1 overflow-auto p-3">
        <DraftBoardGrid
          teams={teams}
          roundCount={draft.roundCount}
          picks={picks}
          playersById={playersById}
          byeWeeksByTeam={byeWeeksByTeam}
          currentOverallPick={draft.currentOverallPick}
          onEmptyCellClick={isCommissioner ? handleEmptyCellClick : undefined}
        />
      </div>

      {editingPick && (
        <Modal
          title={`Round ${editingPick.round}, Pick ${editingPick.pickInRound} — select player`}
          onClose={() => setEditingPick(null)}
        >
          <AvailablePlayersPanel
            players={undraftedPlayers}
            byeWeeksByTeam={byeWeeksByTeam}
            canDraft
            onDraftPlayer={handleSelectPlayerForEditingPick}
          />
        </Modal>
      )}

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
