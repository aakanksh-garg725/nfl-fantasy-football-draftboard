"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface PendingInviteRow {
  id: string;
  draftName: string;
  teamName: string;
}

/**
 * Seeded from the server-rendered page for a fast first paint, then kept
 * live so a new invite shows up without a manual refresh. The realtime
 * payload for an `invites` row doesn't carry the joined draft/team names
 * `list_my_pending_invites()` provides — rather than duplicate that join
 * client-side, any change just re-runs the same RPC, trading a slightly
 * heavier round trip for one source of truth on what "pending" means.
 */
export function PendingInvites({
  rows: initialRows,
  userId,
}: {
  rows: PendingInviteRow[];
  userId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("list_my_pending_invites");
    setRows(
      (data ?? []).map(
        (row: { id: string; draft_name: string; team_name: string }) => ({
          id: row.id,
          draftName: row.draft_name,
          teamName: row.team_name,
        })
      )
    );
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`pending-invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invites",
          filter: `invited_user_id=eq.${userId}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  async function respond(inviteId: string, accept: boolean) {
    setBusyId(inviteId);
    setError(null);
    const supabase = createClient();
    const { data: draftId, error } = await supabase.rpc("respond_to_invite", {
      p_invite_id: inviteId,
      p_accept: accept,
    });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    if (accept && draftId) {
      router.push(`/draft/${draftId}/board`);
      return;
    }
    // Optimistic — the realtime subscription above would remove it too, but
    // not before an extra round trip.
    setRows((prev) => prev.filter((r) => r.id !== inviteId));
  }

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-2">
      <h2 className="text-sm font-bold uppercase text-black/50 dark:text-white/50">
        Pending invites
      </h2>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3"
          >
            <span>
              Draft <b>{row.teamName}</b> in <b>{row.draftName}</b>?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => respond(row.id, true)}
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => respond(row.id, false)}
                className="rounded-md bg-black/5 px-3 py-1.5 text-xs font-bold text-black/70 disabled:opacity-50 dark:bg-white/10 dark:text-white/70"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
