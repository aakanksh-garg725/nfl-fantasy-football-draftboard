import clsx from "clsx";
import type { PickStatus } from "@/lib/draft/types";

export interface EmptyPickCellProps {
  round: number;
  pickInRound: number;
  /** true when this is the current overall pick (the one on the clock) */
  isCurrent: boolean;
  status: PickStatus;
  onClick?: () => void;
}

export function EmptyPickCell({
  round,
  pickInRound,
  isCurrent,
  status,
  onClick,
}: EmptyPickCellProps) {
  if (isCurrent) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        <span className="text-xs font-bold tracking-wide uppercase">
          Picking
        </span>
      </button>
    );
  }

  if (status === "skipped") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        title="Skipped — click to fill in once known"
      >
        <span className="text-xs font-bold tracking-wide uppercase">
          Skipped
        </span>
        <span className="text-[10px] opacity-70">
          {round}.{pickInRound}
        </span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        "flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-black/5 bg-black/5 text-sm text-black/30 dark:border-white/5 dark:bg-white/5 dark:text-white/25"
      )}
    >
      {round}.{pickInRound}
    </div>
  );
}
