"use client";

import { useState } from "react";
import { useDraft } from "@/components/draft/DraftProvider";
import { TeamSlotEditor } from "@/components/draft/TeamSlotEditor";
import { InviteManager } from "@/components/draft/InviteManager";
import { createClient } from "@/lib/supabase/client";
import type { DraftTeam } from "@/lib/draft/types";

export default function SettingsPage() {
  const { draft, teams: initialTeams, isCommissioner } = useDraft();
  const [teams, setTeams] = useState<DraftTeam[]>(initialTeams);

  if (!isCommissioner) {
    return <p className="p-4 text-sm">Only the commissioner can view settings.</p>;
  }

  async function handleSpectatorToggle(enabled: boolean) {
    const supabase = createClient();
    await supabase.rpc("set_spectator_enabled", {
      p_draft_id: draft.id,
      p_enabled: enabled,
    });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-bold">Team names</h2>
        <TeamSlotEditor
          teams={teams}
          onRenamed={(teamId, newName) =>
            setTeams((prev) =>
              prev.map((t) => (t.id === teamId ? { ...t, teamName: newName } : t))
            )
          }
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Invite virtual drafters</h2>
        <InviteManager draftId={draft.id} teams={teams} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Spectator link</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={draft.spectatorEnabled}
            onChange={(e) => handleSpectatorToggle(e.target.checked)}
          />
          Allow anyone with the link to view this draft (read-only, no account needed)
        </label>
        {draft.spectatorEnabled && (
          <code className="mt-2 block truncate rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
            {origin}/spectate/{draft.id}
          </code>
        )}
      </section>
    </div>
  );
}
