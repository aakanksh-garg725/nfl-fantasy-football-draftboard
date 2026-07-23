"use client";

import { useMemo, useState } from "react";
import { TimerHeaderBar } from "@/components/draft/TimerHeaderBar";
import { DraftBoardGrid } from "@/components/draft/DraftBoardGrid";
import { AvailablePlayersPanel } from "@/components/draft/AvailablePlayersPanel";
import {
  MOCK_ROUND_COUNT,
  buildMockPicks,
  mockByeWeeksByTeam,
  mockPlayers,
  mockTeams,
} from "@/lib/draft/mockData";
import type { TimerStatus } from "@/lib/draft/types";

export default function DemoPage() {
  const [view, setView] = useState<"board" | "players">("board");
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("stopped");
  const [displaySeconds, setDisplaySeconds] = useState(90);
  const durationSeconds = 90;

  const picks = useMemo(() => buildMockPicks(), []);
  const playersById = useMemo(
    () => new Map(mockPlayers.map((p) => [p.id, p])),
    []
  );
  const currentOverallPick = 13;
  const currentPick = picks.find(
    (p) => p.overallPickNumber === currentOverallPick
  )!;
  const onClockTeam = mockTeams.find((t) => t.id === currentPick.teamId)!;
  const previousPickRow = picks.find(
    (p) => p.overallPickNumber === currentOverallPick - 1
  )!;
  const previousPlayer = playersById.get(previousPickRow.playerId!)!;
  const previousTeam = mockTeams.find(
    (t) => t.id === previousPickRow.teamId
  )!;

  const nextUpTeamNames = picks
    .filter((p) => p.overallPickNumber > currentOverallPick)
    .slice(0, 3)
    .map((p) => mockTeams.find((t) => t.id === p.teamId)!.teamName);

  const draftedPlayerIds = new Set(
    picks.filter((p) => p.status === "made").map((p) => p.playerId)
  );
  const availablePlayers = mockPlayers.filter((p) => !draftedPlayerIds.has(p.id));

  return (
    <div className="flex min-h-screen flex-col">
      <TimerHeaderBar
        timerStatus={timerStatus}
        displaySeconds={displaySeconds}
        durationSeconds={durationSeconds}
        round={currentPick.round}
        pickInRound={currentPick.pickInRound}
        onClockTeamName={onClockTeam.teamName}
        nextUpTeamNames={nextUpTeamNames}
        previousPick={{
          player: previousPlayer,
          byeWeek: previousPlayer.nflTeam
            ? (mockByeWeeksByTeam.get(previousPlayer.nflTeam) ?? null)
            : null,
          teamName: previousTeam.teamName,
        }}
        isCommissioner
        onStart={() => setTimerStatus("running")}
        onPause={() => setTimerStatus("paused")}
        onRestart={() => {
          setTimerStatus("stopped");
          setDisplaySeconds(durationSeconds);
        }}
        onEdit={() => {}}
      />

      <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 dark:border-white/10 dark:bg-neutral-950">
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-bold ${view === "board" ? "bg-emerald-500 text-white" : "bg-black/5 dark:bg-white/10"}`}
          onClick={() => setView("board")}
        >
          Draft Board
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-bold ${view === "players" ? "bg-emerald-500 text-white" : "bg-black/5 dark:bg-white/10"}`}
          onClick={() => setView("players")}
        >
          Available Players
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {view === "board" ? (
          <DraftBoardGrid
            teams={mockTeams}
            roundCount={MOCK_ROUND_COUNT}
            picks={picks}
            playersById={playersById}
            byeWeeksByTeam={mockByeWeeksByTeam}
            currentOverallPick={currentOverallPick}
          />
        ) : (
          <AvailablePlayersPanel
            players={availablePlayers}
            byeWeeksByTeam={mockByeWeeksByTeam}
            canDraft
            onDraftPlayer={() => {}}
          />
        )}
      </div>
    </div>
  );
}
