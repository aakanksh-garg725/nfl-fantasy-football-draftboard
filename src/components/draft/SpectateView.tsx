"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerClockOffset } from "@/lib/hooks/useServerClockOffset";
import { deriveRemainingSeconds } from "@/lib/draft/timer";
import { mapDraftRow, mapPickRow, mapTimerRow } from "@/lib/draft/mappers";
import { TimerHeaderBar } from "./TimerHeaderBar";
import { DraftBoardGrid } from "./DraftBoardGrid";
import type {
  DraftSettings,
  DraftTeam,
  DraftTimerState,
  Pick,
  Player,
} from "@/lib/draft/types";

export function SpectateView({
  initialDraft,
  teams,
  initialPicks,
  initialTimer,
  players,
  byeWeeksByTeam,
}: {
  initialDraft: DraftSettings;
  teams: DraftTeam[];
  initialPicks: Pick[];
  initialTimer: DraftTimerState;
  players: Player[];
  byeWeeksByTeam: Map<string, number>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const clockOffsetMs = useServerClockOffset();

  const [draft, setDraft] = useState(initialDraft);
  const [timer, setTimer] = useState(initialTimer);
  const [picksById, setPicksById] = useState(
    () => new Map(initialPicks.map((p) => [p.id, p]))
  );
  // Seeded with the static server value (not Date.now()) so SSR and the
  // client's first hydration pass render identical text; the effect below
  // corrects it to the live value immediately after mount, client-side only.
  const [displaySeconds, setDisplaySeconds] = useState(
    () => initialTimer.remainingSeconds
  );

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  useEffect(() => {
    const channel = supabase
      .channel(`spectate:${initialDraft.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "picks", filter: `draft_id=eq.${initialDraft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapPickRow>[0] | undefined;
          if (!row) return;
          const pick = mapPickRow(row);
          setPicksById((prev) => new Map(prev).set(pick.id, pick));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_timer", filter: `draft_id=eq.${initialDraft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapTimerRow>[0] | undefined;
          if (row) setTimer(mapTimerRow(row));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drafts", filter: `id=eq.${initialDraft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapDraftRow>[0] | undefined;
          if (row) setDraft(mapDraftRow(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initialDraft.id]);

  useEffect(() => {
    const tick = () =>
      setDisplaySeconds(deriveRemainingSeconds(timer, Date.now(), clockOffsetMs));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer, clockOffsetMs]);

  const picks = Array.from(picksById.values());
  const sortedPicks = [...picks].sort((a, b) => a.overallPickNumber - b.overallPickNumber);
  const currentPick = sortedPicks.find((p) => p.overallPickNumber === draft.currentOverallPick);
  const onClockTeam = currentPick ? teams.find((t) => t.id === currentPick.teamId) : undefined;

  const previousMadePick = [...sortedPicks]
    .reverse()
    .find((p) => p.overallPickNumber < draft.currentOverallPick && p.status === "made");
  const previousPlayer = previousMadePick?.playerId
    ? playersById.get(previousMadePick.playerId)
    : undefined;
  const previousTeam = previousMadePick
    ? teams.find((t) => t.id === previousMadePick.teamId)
    : undefined;

  const nextUpTeamNames = sortedPicks
    .filter((p) => p.overallPickNumber > draft.currentOverallPick)
    .slice(0, 3)
    .map((p) => teams.find((t) => t.id === p.teamId)?.teamName ?? "");

  return (
    <div className="flex min-h-screen flex-col">
      <TimerHeaderBar
        timerStatus={timer.status}
        displaySeconds={displaySeconds}
        durationSeconds={timer.durationSeconds}
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
        isCommissioner={false}
      />
      <div className="flex-1 overflow-auto p-3">
        <DraftBoardGrid
          teams={teams}
          roundCount={draft.roundCount}
          picks={picks}
          playersById={playersById}
          byeWeeksByTeam={byeWeeksByTeam}
          currentOverallPick={draft.currentOverallPick}
        />
      </div>
    </div>
  );
}
