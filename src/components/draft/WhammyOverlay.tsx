"use client";

import { useEffect, useRef } from "react";
import { WHAMMY_VISIBLE_MS, type ActiveWhammy } from "@/lib/hooks/useWhammy";

/**
 * Full-screen whammy announcement. Shown on every screen at once for five
 * seconds as each round wraps up, naming the team on the hook and its dare.
 *
 * The backdrop stays `pointer-events-none`: the pick timer keeps running
 * underneath, so the popup must never intercept a click from the team that's
 * on the clock. Dismiss-on-outside-click is therefore a document-level capture
 * listener rather than a click handler on the backdrop — the click both closes
 * the popup and still lands on whatever it was aimed at. It's an announcement,
 * not a dialog — hence a polite live region rather than a focus-trapping modal.
 */
export function WhammyOverlay({
  whammy,
  onDismiss,
}: {
  whammy: ActiveWhammy | null;
  onDismiss: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!whammy) return;

    // `pointerdown` rather than `click` so a drag that starts outside still
    // counts, and in the capture phase so it can't be swallowed on the way down.
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      onDismiss();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [whammy, onDismiss]);

  if (!whammy) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      style={{ animation: "whammy-pop-in 220ms ease-out" }}
    >
      {/* The one clickable region: it takes pointer events purely so a click on
          the dare itself isn't read as a click outside it. */}
      <div
        ref={panelRef}
        className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border-4 border-red-600 bg-neutral-900 text-center shadow-2xl"
        style={{ animation: "whammy-pop-in 300ms cubic-bezier(0.2, 1.4, 0.4, 1)" }}
      >
        <div className="bg-red-600 px-6 py-2 text-2xl font-black tracking-[0.2em] text-white uppercase sm:text-3xl">
          Whammy
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-8">
          <div className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">
            End of Round {whammy.round}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-red-500 sm:text-3xl">
            {whammy.teamName}
          </div>
          <p className="mt-4 text-xl leading-snug font-bold text-white sm:text-3xl">
            {whammy.dare}
          </p>
        </div>

        <div className="h-1.5 w-full bg-white/10">
          <div
            className="h-full origin-left bg-red-600"
            style={{
              animation: `whammy-drain ${WHAMMY_VISIBLE_MS}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
