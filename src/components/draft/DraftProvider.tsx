"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useServerClockOffset } from "@/lib/hooks/useServerClockOffset";
import { deriveRemainingSeconds } from "@/lib/draft/timer";
import {
  mapDraftRow,
  mapPickRow,
  mapTimerRow,
} from "@/lib/draft/mappers";
import type {
  DraftMemberRole,
  DraftSettings,
  DraftTeam,
  DraftTimerState,
  Pick,
  Player,
} from "@/lib/draft/types";

export interface DraftProviderInitialData {
  draft: DraftSettings;
  teams: DraftTeam[];
  picks: Pick[];
  timer: DraftTimerState;
  players: Player[];
  byeWeeksByTeam: Map<string, number>;
  currentUserId: string;
  myRole: DraftMemberRole | null;
  myTeamId: string | null;
}

interface DraftContextValue {
  draft: DraftSettings;
  teams: DraftTeam[];
  picks: Pick[];
  playersById: Map<string, Player>;
  byeWeeksByTeam: Map<string, number>;
  currentUserId: string;
  isCommissioner: boolean;
  myTeamId: string | null;
  timerStatus: DraftTimerState["status"];
  displaySeconds: number;
  durationSeconds: number;
  lastError: string | null;
  clearError: () => void;
  makePick: (playerId: string) => Promise<boolean>;
  commissionerEditPick: (pickId: string, playerId: string | null) => Promise<boolean>;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  restartTimer: () => Promise<void>;
  editTimer: (seconds: number, applyTo: "current" | "default") => Promise<void>;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used within a DraftProvider");
  return ctx;
}

export function DraftProvider({
  initial,
  children,
}: {
  initial: DraftProviderInitialData;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const clockOffsetMs = useServerClockOffset();

  const [draft, setDraft] = useState(initial.draft);
  const [timer, setTimer] = useState(initial.timer);
  const [picksById, setPicksById] = useState(
    () => new Map(initial.picks.map((p) => [p.id, p]))
  );
  const [lastError, setLastError] = useState<string | null>(null);
  // Seeded with the static server value (not Date.now()) so SSR and the
  // client's first hydration pass render identical text; the effect below
  // corrects it to the live value immediately after mount, client-side only.
  const [displaySeconds, setDisplaySeconds] = useState(
    () => initial.timer.remainingSeconds
  );

  const playersById = useMemo(
    () => new Map(initial.players.map((p) => [p.id, p])),
    [initial.players]
  );

  // Realtime subscriptions for picks / timer / draft-level fields.
  useEffect(() => {
    const channel = supabase
      .channel(`draft:${initial.draft.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "picks",
          filter: `draft_id=eq.${initial.draft.id}`,
        },
        (payload) => {
          const row = payload.new as Parameters<typeof mapPickRow>[0] | undefined;
          if (!row) return;
          const pick = mapPickRow(row);
          setPicksById((prev) => {
            const next = new Map(prev);
            next.set(pick.id, pick);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_timer",
          filter: `draft_id=eq.${initial.draft.id}`,
        },
        (payload) => {
          const row = payload.new as Parameters<typeof mapTimerRow>[0] | undefined;
          if (!row) return;
          setTimer(mapTimerRow(row));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drafts",
          filter: `id=eq.${initial.draft.id}`,
        },
        (payload) => {
          const row = payload.new as Parameters<typeof mapDraftRow>[0] | undefined;
          if (!row) return;
          setDraft(mapDraftRow(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initial.draft.id]);

  // Local 1s tick between realtime events; re-derived from authoritative state.
  useEffect(() => {
    const tick = () =>
      setDisplaySeconds(deriveRemainingSeconds(timer, Date.now(), clockOffsetMs));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timer, clockOffsetMs]);

  // Auto-skip: retries every tick until it succeeds or the timer state
  // actually moves on. Only an in-flight call is guarded against — a failed
  // call (network blip, transient auth hiccup, a racing client already
  // handling it) must NOT permanently block future attempts, or a single
  // dropped request leaves the draft stuck until someone refreshes.
  const skipInFlightRef = useRef(false);
  useEffect(() => {
    if (
      timer.status === "running" &&
      displaySeconds <= 0 &&
      !skipInFlightRef.current
    ) {
      skipInFlightRef.current = true;
      (async () => {
        try {
          await supabase.rpc("skip_expired_pick", { p_draft_id: initial.draft.id });
        } catch {
          // Ignore — the next tick retries if the pick is still expired.
        } finally {
          skipInFlightRef.current = false;
        }
      })();
    }
  }, [displaySeconds, timer, supabase, initial.draft.id]);

  const clearError = useCallback(() => setLastError(null), []);

  const makePick = useCallback(
    async (playerId: string) => {
      const { error } = await supabase.rpc("make_pick", {
        p_draft_id: initial.draft.id,
        p_player_id: playerId,
      });
      if (error) {
        setLastError(error.message);
        return false;
      }
      return true;
    },
    [supabase, initial.draft.id]
  );

  const commissionerEditPick = useCallback(
    async (pickId: string, playerId: string | null) => {
      const { error } = await supabase.rpc("commissioner_edit_pick", {
        p_pick_id: pickId,
        p_player_id: playerId,
      });
      if (error) {
        setLastError(error.message);
        return false;
      }
      return true;
    },
    [supabase]
  );

  const startTimer = useCallback(async () => {
    const { error } = await supabase.rpc("start_timer", { p_draft_id: initial.draft.id });
    if (error) setLastError(error.message);
  }, [supabase, initial.draft.id]);

  const pauseTimer = useCallback(async () => {
    const { error } = await supabase.rpc("pause_timer", { p_draft_id: initial.draft.id });
    if (error) setLastError(error.message);
  }, [supabase, initial.draft.id]);

  const restartTimer = useCallback(async () => {
    const { error } = await supabase.rpc("restart_timer", { p_draft_id: initial.draft.id });
    if (error) setLastError(error.message);
  }, [supabase, initial.draft.id]);

  const editTimer = useCallback(
    async (seconds: number, applyTo: "current" | "default") => {
      const { error } = await supabase.rpc("edit_timer", {
        p_draft_id: initial.draft.id,
        p_new_duration_seconds: seconds,
        p_apply_to: applyTo,
      });
      if (error) setLastError(error.message);
    },
    [supabase, initial.draft.id]
  );

  const value: DraftContextValue = {
    draft,
    teams: initial.teams,
    picks: useMemo(() => Array.from(picksById.values()), [picksById]),
    playersById,
    byeWeeksByTeam: initial.byeWeeksByTeam,
    currentUserId: initial.currentUserId,
    isCommissioner: initial.myRole === "commissioner",
    myTeamId: initial.myTeamId,
    timerStatus: timer.status,
    displaySeconds,
    durationSeconds: timer.durationSeconds,
    lastError,
    clearError,
    makePick,
    commissionerEditPick,
    startTimer,
    pauseTimer,
    restartTimer,
    editTimer,
  };

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}
