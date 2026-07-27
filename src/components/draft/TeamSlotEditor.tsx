"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DraftTeam } from "@/lib/draft/types";

const SAVE_DEBOUNCE_MS = 600;

interface DragRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface InviteRow {
  id: string;
  team_id: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
}

export function TeamSlotEditor({
  draftId,
  teams,
  canEditTeams = true,
}: {
  draftId: string;
  teams: DraftTeam[];
  /** Team names and draft order both freeze once the draft leaves 'setup'. */
  canEditTeams?: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);

  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  // Only meaningful while dragging (dragId set) — the live drop-preview
  // order.
  const [order, setOrder] = useState<string[]>(() => teams.map((t) => t.id));
  const [dragRect, setDragRect] = useState<DragRect | null>(null);
  // After a drop, holds the committed order until `teams` (fed live by
  // DraftProvider's realtime subscription) actually confirms it — avoids a
  // snap-back-then-forward flash while that round-trip is in flight. Cleared
  // implicitly: once `teams` matches it, rendering falls through to `teams`.
  const [pendingOrderIds, setPendingOrderIds] = useState<string[] | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      Object.values(activeTimers).forEach(clearTimeout);
    };
  }, []);

  const refreshInvites = useCallback(async () => {
    const supabase = createClient();
    const { data: inviteRows } = await supabase
      .from("invites")
      .select("id, team_id, token, status")
      .eq("draft_id", draftId);
    setInvites(inviteRows ?? []);

    const ownerIds = teams.map((t) => t.ownerUserId).filter((id): id is string => !!id);
    if (ownerIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ownerIds);
      const map: Record<string, string> = {};
      for (const p of profileRows ?? []) {
        map[p.id] = p.display_name || p.email;
      }
      setOwnerNames(map);
    }
  }, [draftId, teams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    refreshInvites();
  }, [refreshInvites]);

  async function handleCreateInvite(teamId: string) {
    setInviteBusyId(teamId);
    const supabase = createClient();
    await supabase.rpc("create_invite", { p_draft_id: draftId, p_team_id: teamId });
    setInviteBusyId(null);
    refreshInvites();
  }

  async function handleRevokeInvite(inviteId: string) {
    const supabase = createClient();
    await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
    refreshInvites();
  }

  function handleCopyInvite(invite: InviteRow) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    navigator.clipboard.writeText(`${origin}/invite/${invite.token}`);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId((current) => (current === invite.id ? null : current)), 1500);
  }

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const orderedTeams = useMemo(() => {
    const ids = dragId ? order : pendingOrderIds;
    if (!ids) return teams;
    if (!dragId && ids.join("|") === teams.map((t) => t.id).join("|")) return teams;
    return ids.map((id) => teamsById.get(id)).filter((t): t is DraftTeam => Boolean(t));
  }, [dragId, order, pendingOrderIds, teams, teamsById]);

  async function save(teamId: string, name: string, original: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === original) return;
    setSavingId(teamId);
    const supabase = createClient();
    await supabase.rpc("rename_team", {
      p_team_id: teamId,
      p_team_name: trimmed,
    });
    setSavingId((current) => (current === teamId ? null : current));
  }

  function scheduleSave(teamId: string, name: string, original: string) {
    clearTimeout(timers.current[teamId]);
    timers.current[teamId] = setTimeout(() => {
      save(teamId, name, original);
    }, SAVE_DEBOUNCE_MS);
  }

  function flushSave(teamId: string, name: string, original: string) {
    clearTimeout(timers.current[teamId]);
    save(teamId, name, original);
  }

  function commitOrder(finalOrderIds: string[]) {
    setReorderError(null);
    setPendingOrderIds(finalOrderIds);

    const supabase = createClient();
    supabase
      .rpc("reorder_teams", {
        p_draft_id: draftId,
        p_team_ids: finalOrderIds,
      })
      .then(({ error }) => {
        if (error) {
          setReorderError("Couldn't save the new order — reverted.");
          setPendingOrderIds(null);
        }
      });
  }

  function startDrag(e: React.PointerEvent, teamId: string) {
    if (!canEditTeams || e.button !== 0) return;
    e.preventDefault();
    const row = rowRefs.current[teamId];
    if (!row) return;

    const rect = row.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const startOrder = teams.map((t) => t.id);
    let currentOrder = startOrder;
    let latestClientY = e.clientY;
    let frameId = 0;
    let pending = false;

    setDragId(teamId);
    setOrder(startOrder);
    setDragRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });

    function applyFrame() {
      pending = false;
      setDragRect((prev) => (prev ? { ...prev, top: latestClientY - offsetY } : prev));

      // Compare the pointer against the live midpoints of the other rows
      // (measured fresh each frame) to find where the dragged row belongs.
      const others = currentOrder.filter((id) => id !== teamId);
      let targetIndex = others.length;
      for (let i = 0; i < others.length; i++) {
        const el = rowRefs.current[others[i]];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (latestClientY < r.top + r.height / 2) {
          targetIndex = i;
          break;
        }
      }

      const next = [...others];
      next.splice(targetIndex, 0, teamId);
      if (next.join("|") !== currentOrder.join("|")) {
        currentOrder = next;
        setOrder(next);
      }
    }

    function onMove(ev: PointerEvent) {
      latestClientY = ev.clientY;
      if (!pending) {
        pending = true;
        frameId = requestAnimationFrame(applyFrame);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      cancelAnimationFrame(frameId);
      setDragId(null);
      setDragRect(null);
      if (currentOrder.join("|") !== startOrder.join("|")) {
        commitOrder(currentOrder);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const draggedTeam = dragId ? teamsById.get(dragId) : null;

  return (
    <div className="relative flex flex-col gap-2">
      {!canEditTeams && (
        <p className="text-xs text-black/40 dark:text-white/40">
          Team names and draft order are locked once the draft has started.
        </p>
      )}
      {reorderError && <p className="text-xs text-red-500">{reorderError}</p>}
      {orderedTeams.map((team, i) => {
        const isDragging = dragId === team.id;
        const pendingInvite = invites.find(
          (inv) => inv.team_id === team.id && inv.status === "pending"
        );
        return (
          <div
            key={team.id}
            ref={(el) => {
              rowRefs.current[team.id] = el;
            }}
            className="flex items-center gap-2 rounded-md"
            style={isDragging ? { visibility: "hidden" } : undefined}
          >
            <span
              onPointerDown={(e) => startDrag(e, team.id)}
              className={`select-none px-1 text-black/30 dark:text-white/30 ${
                canEditTeams ? "cursor-grab active:cursor-grabbing touch-none" : "cursor-not-allowed opacity-40"
              }`}
              title={canEditTeams ? "Drag to reorder" : undefined}
              aria-hidden
            >
              ⠿
            </span>
            <span className="w-6 text-sm text-black/40 dark:text-white/40">{i + 1}</span>
            <input
              type="text"
              value={drafts[team.id] ?? team.teamName}
              disabled={!canEditTeams}
              onChange={(e) => {
                const value = e.target.value;
                setDrafts((prev) => ({ ...prev, [team.id]: value }));
                scheduleSave(team.id, value, team.teamName);
              }}
              onBlur={(e) => flushSave(team.id, e.target.value, team.teamName)}
              className="min-w-0 flex-1 rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10"
            />
            {savingId === team.id && (
              <span className="shrink-0 text-xs text-black/40 dark:text-white/40">Saving…</span>
            )}

            <div className="flex w-48 shrink-0 items-center justify-start gap-1 text-xs">
              {team.ownerUserId ? (
                <span className="truncate font-bold text-emerald-600 dark:text-emerald-400">
                  Claimed by {ownerNames[team.ownerUserId] ?? "a virtual drafter"}
                </span>
              ) : pendingInvite ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(pendingInvite)}
                    className="rounded-md bg-black/5 px-2 py-1 font-bold dark:bg-white/10"
                  >
                    {copiedId === pendingInvite.id ? "Copied!" : "Copy invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(pendingInvite.id)}
                    className="rounded-md bg-red-500/10 px-2 py-1 font-bold text-red-600 dark:text-red-400"
                  >
                    Revoke
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={inviteBusyId === team.id}
                  onClick={() => handleCreateInvite(team.id)}
                  className="rounded-md bg-emerald-500 px-2 py-1 font-bold text-white disabled:opacity-50"
                >
                  Invite
                </button>
              )}
            </div>
          </div>
        );
      })}

      {draggedTeam && dragRect && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-md border border-emerald-500 bg-white shadow-lg dark:bg-neutral-900"
          style={{
            top: dragRect.top,
            left: dragRect.left,
            width: dragRect.width,
            height: dragRect.height,
          }}
        >
          <span className="select-none px-1 text-black/30 dark:text-white/30">⠿</span>
          <span className="w-6 text-sm text-black/40 dark:text-white/40">
            {order.indexOf(draggedTeam.id) + 1}
          </span>
          <span className="flex-1 truncate rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/10">
            {drafts[draggedTeam.id] ?? draggedTeam.teamName}
          </span>
          <span className="w-12" />
        </div>
      )}
    </div>
  );
}
