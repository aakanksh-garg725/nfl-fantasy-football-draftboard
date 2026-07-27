"use client";

import { useDraft } from "@/components/draft/DraftProvider";
import { TeamSlotEditor } from "@/components/draft/TeamSlotEditor";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { draft, teams, isCommissioner } = useDraft();

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
    // The draft layout is a fixed-height flex column with overflow hidden, so
    // this page owns its own scroll — otherwise the invite/team sections run off
    // the bottom of the viewport with no way to reach them.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-bold">Team names &amp; draft order</h2>
        <p className="mb-2 text-xs text-black/40 dark:text-white/40">
          Drag the handle to reorder teams for the snake draft. Use Invite to
          generate a virtual drafter link for a team.
        </p>
        <TeamSlotEditor
          draftId={draft.id}
          teams={teams}
          canEditTeams={draft.status === "setup"}
        />
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
    </div>
  );
}
