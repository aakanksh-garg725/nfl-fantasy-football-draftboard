"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TIMER_DURATION_OPTIONS, type TimerDurationOption } from "@/lib/draft/types";
import { formatSeconds } from "@/lib/draft/timer";

export function TimerEditDialog({
  currentDurationSeconds,
  onConfirm,
  onClose,
}: {
  currentDurationSeconds: number;
  /** Always applies to this pick and the default for every pick after — there's no "just this pick" option. */
  onConfirm: (seconds: number) => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState<TimerDurationOption>(
    (TIMER_DURATION_OPTIONS as readonly number[]).includes(currentDurationSeconds)
      ? (currentDurationSeconds as TimerDurationOption)
      : 90
  );

  return (
    <Modal title="Edit pick timer" onClose={onClose}>
      <div className="flex flex-col gap-4 p-2">
        <div>
          <div className="mb-1 text-sm font-semibold">Duration</div>
          <div className="flex gap-2">
            {TIMER_DURATION_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeconds(s)}
                className={`flex-1 rounded-md border py-2 font-bold ${
                  seconds === s
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {formatSeconds(s)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-black/50 dark:text-white/50">
          Applies to this pick and every pick for the rest of the draft.
        </p>

        <button
          type="button"
          onClick={() => onConfirm(seconds)}
          className="rounded-md bg-emerald-500 py-2 font-bold text-white"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
