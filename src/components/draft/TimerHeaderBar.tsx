import clsx from "clsx";
import { formatSeconds } from "@/lib/draft/timer";
import type { Player, TimerStatus } from "@/lib/draft/types";
import { PlayerCard } from "./PlayerCard";

export interface PreviousPick {
  player: Player;
  byeWeek: number | null;
  teamName: string;
}

export interface TimerHeaderBarProps {
  timerStatus: TimerStatus;
  displaySeconds: number;
  durationSeconds: number;
  round: number;
  /** The pick's position within its round (not the overall pick number). */
  pickInRound: number;
  onClockTeamName: string;
  nextUpTeamNames: string[];
  previousPick: PreviousPick | null;
  isCommissioner: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onRestart?: () => void;
  onEdit?: () => void;
}

export function TimerHeaderBar({
  timerStatus,
  displaySeconds,
  durationSeconds,
  round,
  pickInRound,
  onClockTeamName,
  nextUpTeamNames,
  previousPick,
  isCommissioner,
  onStart,
  onPause,
  onRestart,
  onEdit,
}: TimerHeaderBarProps) {
  const segments = 3;
  const filledFraction = durationSeconds > 0 ? displaySeconds / durationSeconds : 0;

  return (
    <div className="flex w-full flex-col gap-3 bg-neutral-900 px-4 py-3 text-white sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        {isCommissioner && (
          <div className="flex items-center gap-1.5">
            <IconButton
              label={timerStatus === "running" ? "Pause" : "Start"}
              onClick={timerStatus === "running" ? onPause : onStart}
            >
              {timerStatus === "running" ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton label="Edit timer" onClick={onEdit}>
              <EditIcon />
            </IconButton>
            <IconButton label="Restart timer" onClick={onRestart}>
              <RestartIcon />
            </IconButton>
          </div>
        )}
        <div>
          <div className="font-mono text-4xl leading-none font-bold tabular-nums text-amber-400">
            {formatSeconds(displaySeconds)}
          </div>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: segments }).map((_, i) => {
              const segStart = i / segments;
              const segEnd = (i + 1) / segments;
              const segFill = Math.min(
                1,
                Math.max(0, (filledFraction - segStart) / (segEnd - segStart))
              );
              return (
                <div
                  key={i}
                  className="h-1 w-10 overflow-hidden rounded-full bg-white/15"
                >
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${segFill * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-white/10 sm:border-x sm:px-6">
        <div className="text-center">
          <div className="text-3xl leading-none font-bold">{round}</div>
          <div className="text-[10px] font-semibold tracking-wide text-white/50 uppercase">
            Round
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl leading-none font-bold">{pickInRound}</div>
          <div className="text-[10px] font-semibold tracking-wide text-white/50 uppercase">
            Pick
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">
          On the clock
        </div>
        <div className="truncate text-xl font-extrabold sm:text-2xl">
          {onClockTeamName}
        </div>
        {nextUpTeamNames.length > 0 && (
          <div className="mt-0.5 truncate text-xs text-white/50">
            <span className="font-semibold text-white/70">Next up</span>{" "}
            {nextUpTeamNames.join(" › ")}
          </div>
        )}
      </div>

      {previousPick && (
        <div className="flex items-center gap-2 border-white/10 sm:border-l sm:pl-6">
          <div className="text-right">
            <div className="text-[10px] font-semibold tracking-wide text-white/50 uppercase">
              Previous pick
            </div>
            <div className="text-sm font-bold">{previousPick.teamName}</div>
          </div>
          <div className="w-24">
            <PlayerCard
              player={previousPick.player}
              byeWeek={previousPick.byeWeek}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/20"
      )}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M3 2l11 6-11 6z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <rect x="3" y="2" width="3.5" height="12" />
      <rect x="9.5" y="2" width="3.5" height="12" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M11.3 1.3a1 1 0 0 1 1.4 0l2 2a1 1 0 0 1 0 1.4l-8 8-3.7 1 1-3.7 8-8z" />
    </svg>
  );
}
function RestartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
      <path d="M8 2a6 6 0 1 1-5.7 4.1H4.4A4.5 4.5 0 1 0 8 3.5V6L4.5 3.5 8 1z" />
    </svg>
  );
}
