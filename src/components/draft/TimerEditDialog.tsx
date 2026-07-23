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
  onConfirm: (seconds: number, applyTo: "current" | "default") => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState<TimerDurationOption>(
    (TIMER_DURATION_OPTIONS as readonly number[]).includes(currentDurationSeconds)
      ? (currentDurationSeconds as TimerDurationOption)
      : 90
  );
  const [applyTo, setApplyTo] = useState<"current" | "default">("current");

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

        <div>
          <div className="mb-1 text-sm font-semibold">Apply to</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={applyTo === "current"}
              onChange={() => setApplyTo("current")}
            />
            Just this pick
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={applyTo === "default"}
              onChange={() => setApplyTo("default")}
            />
            This pick and the default for every pick after
          </label>
        </div>

        <button
          type="button"
          onClick={() => onConfirm(seconds, applyTo)}
          className="rounded-md bg-emerald-500 py-2 font-bold text-white"
        >
          Save
        </button>
      </div>
    </Modal>
  );
}
