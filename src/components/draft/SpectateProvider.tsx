"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerClockOffset } from "@/lib/hooks/useServerClockOffset";
import { useDraftSoundCues } from "@/lib/hooks/useDraftSoundCues";
import { deriveRemainingSeconds } from "@/lib/draft/timer";
import { mapDraftRow, mapPickRow, mapTimerRow } from "@/lib/draft/mappers";
import type {
  DraftSettings,
  DraftTeam,
  DraftTimerState,
  Pick,
  Player,
} from "@/lib/draft/types";

export interface SpectateProviderInitialData {
  draft: DraftSettings;
  teams: DraftTeam[];
  picks: Pick[];
  timer: DraftTimerState;
  players: Player[];
  byeWeeksByTeam: Map<string, number>;
}

interface SpectateContextValue {
  draft: DraftSettings;
  teams: DraftTeam[];
  picks: Pick[];
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
  timerStatus: DraftTimerState["status"];
  displaySeconds: number;
  durationSeconds: number;
}

const SpectateContext = createContext<SpectateContextValue | null>(null);

export function useSpectateDraft(): SpectateContextValue {
  const ctx = useContext(SpectateContext);
  if (!ctx) throw new Error("useSpectateDraft must be used within a SpectateProvider");
  return ctx;
}

/**
 * Read-only counterpart to DraftProvider for the public spectate link: same
 * realtime sync (picks/timer/draft rows) and sound cues, but no auth, no team
 * roster subscription (spectators never rename/reorder teams), and no
 * mutation callbacks.
 */
export function SpectateProvider({
  initial,
  children,
}: {
  initial: SpectateProviderInitialData;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const clockOffsetMs = useServerClockOffset();

  const [draft, setDraft] = useState(initial.draft);
  const [timer, setTimer] = useState(initial.timer);
  const [picksById, setPicksById] = useState(
    () => new Map(initial.picks.map((p) => [p.id, p]))
  );
  const [displaySeconds, setDisplaySeconds] = useState(
    () => initial.timer.remainingSeconds
  );

  const playersById = useMemo(
    () => new Map(initial.players.map((p) => [p.id, p])),
    [initial.players]
  );

  useEffect(() => {
    const channel = supabase
      .channel(`spectate:${initial.draft.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "picks", filter: `draft_id=eq.${initial.draft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapPickRow>[0] | undefined;
          if (!row) return;
          const pick = mapPickRow(row);
          setPicksById((prev) => new Map(prev).set(pick.id, pick));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_timer", filter: `draft_id=eq.${initial.draft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapTimerRow>[0] | undefined;
          if (row) setTimer(mapTimerRow(row));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drafts", filter: `id=eq.${initial.draft.id}` },
        (payload) => {
          const row = payload.new as Parameters<typeof mapDraftRow>[0] | undefined;
          if (row) setDraft(mapDraftRow(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initial.draft.id]);

  useEffect(() => {
    const tick = () =>
      setDisplaySeconds(deriveRemainingSeconds(timer, Date.now(), clockOffsetMs));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer, clockOffsetMs]);

  useDraftSoundCues({
    timerStatus: timer.status,
    displaySeconds,
    currentOverallPick: draft.currentOverallPick,
  });

  const value: SpectateContextValue = {
    draft,
    teams: initial.teams,
    picks: useMemo(() => Array.from(picksById.values()), [picksById]),
    playersById,
    byeWeeksByTeam: initial.byeWeeksByTeam,
    timerStatus: timer.status,
    displaySeconds,
    durationSeconds: timer.durationSeconds,
  };

  return <SpectateContext.Provider value={value}>{children}</SpectateContext.Provider>;
}
