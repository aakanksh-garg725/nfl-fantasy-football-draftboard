"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { ROSTER_FIELDS, totalRosterRounds, type RosterCounts } from "@/lib/draft/types";

/**
 * Commissioner-only roster editor, reached from Settings while the draft is
 * still in setup — update_roster_settings rejects the RPC once it isn't.
 *
 * Doesn't hold "the new roster" in any state the rest of the app reads: on
 * save it just calls the RPC and closes. DraftProvider's realtime
 * subscription on `drafts` delivers the updated row back to every connected
 * client (including this one) the same way any other commissioner action
 * does, which is what actually updates the Roster window.
 */
export function RosterEditDialog({
  draftId,
  currentRoster,
  onClose,
}: {
  draftId: string;
  currentRoster: RosterCounts;
  onClose: () => void;
}) {
  const [roster, setRoster] = useState<RosterCounts>(currentRoster);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundCount = totalRosterRounds(roster);

  function setField(key: keyof RosterCounts, value: number) {
    setRoster((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_roster_settings", {
      p_draft_id: draftId,
      p_roster_qb: roster.qb,
      p_roster_rb: roster.rb,
      p_roster_wr: roster.wr,
      p_roster_te: roster.te,
      p_roster_flex_rb_wr: roster.flexRbWr,
      p_roster_flex_wr_rb_te: roster.flexWrRbTe,
      p_roster_superflex: roster.superflex,
      p_roster_k: roster.k,
      p_roster_dst: roster.dst,
      p_roster_bench: roster.bench,
    });
    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onClose();
  }

  return (
    <Modal title="Edit roster" onClose={onClose} showCloseButton={false}>
      {/* Own header/scroll-body/footer split, same shape as Modal itself:
          the field grid can run taller than the modal on a short or narrow
          screen, and without a bounded, independently-scrolling body the
          Save/Cancel row below it gets pushed past the bottom of the modal
          instead of staying pinned in view. */}
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="text-xs text-black/50 dark:text-white/50">
            Changes reshape every team&apos;s roster slots and rebuild the
            pick order to match the new round count. Only available before
            the draft starts.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {ROSTER_FIELDS.map(({ key, label, min, max }) => (
              <label key={key} className="flex flex-col gap-1">
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={roster[key]}
                  onChange={(e) => {
                    const raw = Math.max(min, Number(e.target.value) || 0);
                    const clamped = max === undefined ? raw : Math.min(max, raw);
                    setField(key, clamped);
                  }}
                  className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
                />
              </label>
            ))}
          </div>

          <p className="mt-3 text-sm text-black/60 dark:text-white/60">
            Total rounds: <span className="font-bold">{roundCount}</span>
          </p>

          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/10 p-2 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md bg-black/5 px-4 py-2 text-sm font-bold disabled:opacity-50 dark:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || roundCount < 1}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
