"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface DraftListRow {
  role: "commissioner" | "drafter";
  draft: {
    id: string;
    name: string;
    season: number;
    status: string;
    team_count: number;
    round_count: number;
  };
}

export function DraftList({ rows }: { rows: DraftListRow[] }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(draftId: string) {
    setDeletingId(draftId);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_draft", { p_draft_id: draftId });
    setDeletingId(null);
    setConfirmingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">
        You&apos;re not part of any drafts yet. Create one, or ask a
        commissioner for an invite link.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map(({ role, draft }) => (
          <li
            key={draft.id}
            className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
          >
            <Link
              href={`/draft/${draft.id}/board`}
              className="min-w-0 flex-1 hover:underline"
            >
              <span className="font-bold">{draft.name}</span>
              <span className="ml-2 text-sm text-black/50 dark:text-white/50">
                {draft.season} · {draft.team_count} teams · {draft.round_count}{" "}
                rounds
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold uppercase dark:bg-white/10">
                {role}
              </span>

              {role === "commissioner" &&
                (confirmingId === draft.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-black/60 dark:text-white/60">
                      Delete permanently?
                    </span>
                    <button
                      type="button"
                      disabled={deletingId === draft.id}
                      onClick={() => handleDelete(draft.id)}
                      className="rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {deletingId === draft.id ? "Deleting…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-md bg-black/5 px-2 py-1 text-xs font-bold dark:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(draft.id)}
                    className="rounded-md bg-black/5 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-500/10 dark:bg-white/10 dark:text-red-400"
                  >
                    Delete
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
