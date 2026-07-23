"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DraftTeam } from "@/lib/draft/types";

export function TeamSlotEditor({
  teams,
  onRenamed,
}: {
  teams: DraftTeam[];
  onRenamed: (teamId: string, newName: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSave(teamId: string) {
    const newName = drafts[teamId];
    if (!newName || !newName.trim()) return;
    setSavingId(teamId);
    const supabase = createClient();
    const { error } = await supabase.rpc("rename_team", {
      p_team_id: teamId,
      p_team_name: newName.trim(),
    });
    setSavingId(null);
    if (!error) onRenamed(teamId, newName.trim());
  }

  return (
    <div className="flex flex-col gap-2">
      {teams.map((team) => (
        <div key={team.id} className="flex items-center gap-2">
          <span className="w-6 text-sm text-black/40 dark:text-white/40">
            {team.slotNumber}
          </span>
          <input
            type="text"
            defaultValue={team.teamName}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [team.id]: e.target.value }))
            }
            className="flex-1 rounded-md border border-black/10 bg-transparent px-3 py-1.5 text-sm dark:border-white/10"
          />
          <button
            type="button"
            disabled={savingId === team.id}
            onClick={() => handleSave(team.id)}
            className="rounded-md bg-black/5 px-3 py-1.5 text-sm font-bold disabled:opacity-50 dark:bg-white/10"
          >
            Save
          </button>
        </div>
      ))}
    </div>
  );
}
