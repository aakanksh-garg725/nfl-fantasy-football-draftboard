"use client";

import { useState } from "react";
import { useDraft } from "@/components/draft/DraftProvider";
import { TeamSlotEditor } from "@/components/draft/TeamSlotEditor";
import { RosterEditDialog } from "@/components/draft/RosterEditDialog";
import { createClient } from "@/lib/supabase/client";
import { ROSTER_FIELDS } from "@/lib/draft/types";

export default function SettingsPage() {
  const { draft, teams, isCommissioner } = useDraft();
  const [copied, setCopied] = useState(false);
  const [showEditRoster, setShowEditRoster] = useState(false);
  const canEditRoster = draft.status === "setup";

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
  const spectateUrl = `${origin}/spectate/${draft.id}`;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(spectateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    // The draft layout is a fixed-height flex column with overflow hidden, so
    // this page owns its own scroll — otherwise the invite/team sections run off
    // the bottom of the viewport with no way to reach them.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-bold">Team names &amp; draft order</h2>
        <p className="mb-2 text-xs text-black/40 dark:text-white/40">
          Drag the handle to reorder teams for the snake draft. Enter the
          email a virtual drafter signed up with to invite them to a team —
          the invite will show up on their dashboard to accept or decline.
        </p>
        <TeamSlotEditor
          draftId={draft.id}
          teams={teams}
          canEditTeams={draft.status === "setup"}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Roster construction</h2>
        <p className="mb-2 text-xs text-black/40 dark:text-white/40">
          {canEditRoster
            ? "How many of each slot every team drafts. Changing this reshapes the Roster window and rebuilds the pick order to match."
            : "Locked once the draft has started."}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
          {ROSTER_FIELDS.map(({ key, label }) => (
            <span key={key}>
              {label} <span className="font-bold">{draft.roster[key]}</span>
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled={!canEditRoster}
          onClick={() => setShowEditRoster(true)}
          className="mt-3 rounded-md bg-black/5 px-3 py-1.5 text-xs font-bold text-black/70 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
        >
          Edit Roster
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Spectator link</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={draft.spectatorEnabled}
            disabled={draft.status !== "setup"}
            onChange={(e) => handleSpectatorToggle(e.target.checked)}
            className="disabled:opacity-50"
          />
          Allow anyone with the link to view this draft (read-only, no account needed)
        </label>
        {draft.status !== "setup" && (
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Locked once the draft has started.
          </p>
        )}
        {draft.spectatorEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <code className="block flex-1 truncate rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
              {spectateUrl}
            </code>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 rounded-md bg-black/5 px-2 py-1 text-xs font-bold hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        )}
      </section>
      </div>

      {showEditRoster && (
        <RosterEditDialog
          draftId={draft.id}
          currentRoster={draft.roster}
          onClose={() => setShowEditRoster(false)}
        />
      )}
    </div>
  );
}
