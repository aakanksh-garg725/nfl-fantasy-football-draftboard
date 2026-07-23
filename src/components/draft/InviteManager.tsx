"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DraftTeam } from "@/lib/draft/types";

interface InviteRow {
  id: string;
  team_id: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
}

export function InviteManager({
  draftId,
  teams,
}: {
  draftId: string;
  teams: DraftTeam[];
}) {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
    refresh();
  }, [refresh]);

  async function handleCreateInvite(teamId: string) {
    setBusyTeamId(teamId);
    const supabase = createClient();
    await supabase.rpc("create_invite", { p_draft_id: draftId, p_team_id: teamId });
    setBusyTeamId(null);
    refresh();
  }

  async function handleRevoke(inviteId: string) {
    const supabase = createClient();
    await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
    refresh();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex flex-col gap-2">
      {teams.map((team) => {
        const invite = invites.find(
          (i) => i.team_id === team.id && i.status === "pending"
        );
        return (
          <div
            key={team.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <span className="w-28 shrink-0 truncate font-bold">{team.teamName}</span>

            {team.ownerUserId ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Claimed by {ownerNames[team.ownerUserId] ?? "a virtual drafter"}
              </span>
            ) : invite ? (
              <>
                <code className="flex-1 truncate rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                  {origin}/invite/{invite.token}
                </code>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(`${origin}/invite/${invite.token}`)
                  }
                  className="rounded-md bg-black/5 px-2 py-1 font-bold dark:bg-white/10"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(invite.id)}
                  className="rounded-md bg-red-500/10 px-2 py-1 font-bold text-red-600 dark:text-red-400"
                >
                  Revoke
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busyTeamId === team.id}
                onClick={() => handleCreateInvite(team.id)}
                className="rounded-md bg-emerald-500 px-3 py-1 font-bold text-white disabled:opacity-50"
              >
                Create invite link
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
