"use client";

import { useState } from "react";

export interface StartDraftOverlayProps {
  isCommissioner: boolean;
  onStart: () => Promise<void>;
}

/**
 * Sits over the board while drafts.status is still 'setup'. Translucent
 * rather than opaque/blurred so the commissioner can still read the draft
 * order and team names underneath before committing to Start.
 */
export function StartDraftOverlay({ isCommissioner, onStart }: StartDraftOverlayProps) {
  const [starting, setStarting] = useState(false);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55">
      {isCommissioner ? (
        <button
          type="button"
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            try {
              await onStart();
            } finally {
              setStarting(false);
            }
          }}
          className="rounded-2xl bg-emerald-500 px-14 py-7 text-3xl font-black tracking-wide text-black uppercase shadow-2xl transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {starting ? "Starting…" : "Start Draft"}
        </button>
      ) : (
        <div className="rounded-2xl bg-black/70 px-8 py-6 text-center text-lg font-semibold text-white shadow-2xl">
          Waiting for the commissioner to start the draft…
        </div>
      )}
    </div>
  );
}
