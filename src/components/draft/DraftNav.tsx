"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

export function DraftNav({
  draftId,
  isCommissioner,
  userName,
}: {
  draftId: string;
  isCommissioner: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const tabs = [
    { href: `/draft/${draftId}/board`, label: "Draft Board" },
    { href: `/draft/${draftId}/roster`, label: "Roster" },
    { href: `/draft/${draftId}/players`, label: "Available Players" },
    ...(isCommissioner
      ? [{ href: `/draft/${draftId}/settings`, label: "Settings" }]
      : []),
  ];

  async function handleLeave() {
    setLeaving(true);
    setLeaveError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("leave_draft", { p_draft_id: draftId });
    if (error) {
      setLeaving(false);
      setLeaveError(error.message);
      return;
    }
    // Membership is gone, so RLS will hide the draft on refresh — head straight
    // back to the dashboard rather than sit on a page we can no longer read.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 dark:border-white/10 dark:bg-neutral-950">
      <Link href="/dashboard" className="mr-2 text-sm text-black/50 dark:text-white/50">
        ← Dashboard
      </Link>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-bold",
            pathname === tab.href
              ? "bg-emerald-500 text-white"
              : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          )}
        >
          {tab.label}
        </Link>
      ))}

      <div className="ml-auto flex items-center gap-3">
        {/* Only drafters leave; a commissioner leaving would orphan the draft, so
            they delete it from the dashboard instead. */}
        {!isCommissioner && (
          <div className="flex items-center gap-1.5">
            {leaveError && (
              <span className="max-w-[16rem] truncate text-xs text-red-500" title={leaveError}>
                {leaveError}
              </span>
            )}
            {confirmingLeave ? (
              <>
                <span className="text-xs text-black/60 dark:text-white/60">
                  Leave this draft?
                </span>
                <button
                  type="button"
                  disabled={leaving}
                  onClick={handleLeave}
                  className="rounded-md bg-red-500 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                >
                  {leaving ? "Leaving…" : "Confirm"}
                </button>
                <button
                  type="button"
                  disabled={leaving}
                  onClick={() => setConfirmingLeave(false)}
                  className="rounded-md bg-black/5 px-2 py-1 text-xs font-bold disabled:opacity-50 dark:bg-white/10"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingLeave(true)}
                className="rounded-md bg-black/5 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-500/10 dark:bg-white/10 dark:text-red-400"
              >
                Leave draft
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col items-end leading-tight">
          <span className="max-w-[12rem] truncate text-sm font-bold">{userName}</span>
          <span className="text-xs text-black/50 dark:text-white/50">
            {isCommissioner ? "Commissioner" : "Drafter"}
          </span>
        </div>
      </div>
    </div>
  );
}
