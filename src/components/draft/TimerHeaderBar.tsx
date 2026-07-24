import clsx from "clsx";
import { formatSeconds } from "@/lib/draft/timer";
import type { Player, TimerStatus } from "@/lib/draft/types";
import { positionBadgeBackground } from "@/lib/draft/positionStyle";
import { splitPlayerName } from "@/lib/draft/playerName";
import { PlayerPortrait } from "./PlayerPortrait";

export interface PreviousPick {
  player: Player;
  /** The fantasy team that made the pick, not the player's NFL team. */
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

/**
 * The countdown drains right-to-left across three pips, so a third of the clock
 * is exactly one pip — which is what sets the colour thresholds below: the bar
 * changes colour at the moment a pip empties, rather than mid-pip where the
 * switch would look arbitrary.
 */
const SEGMENTS = 3;

type ClockTone = "safe" | "warning" | "urgent";

/**
 * Green, amber, red by how much of the pick clock is left. Colour carries the
 * urgency at a glance from across the room, where reading the digits doesn't.
 */
function toneForRemaining(fraction: number): ClockTone {
  if (fraction > 2 / 3) return "safe";
  if (fraction > 1 / 3) return "warning";
  return "urgent";
}

const TONE_FILL: Record<ClockTone, string> = {
  safe: "bg-emerald-500",
  warning: "bg-amber-400",
  urgent: "bg-red-500",
};

/**
 * A step lighter than the fills above. The pips are solid blocks of colour, but
 * the digits are thin strokes on a near-black bar, and the 500 weights that
 * read cleanly as fills go muddy as text at this size.
 */
const TONE_TEXT: Record<ClockTone, string> = {
  safe: "text-emerald-400",
  warning: "text-amber-400",
  urgent: "text-red-400",
};

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
  const filledFraction = durationSeconds > 0 ? displaySeconds / durationSeconds : 0;
  const tone = toneForRemaining(filledFraction);

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
          <div
            className={clsx(
              "font-mono text-4xl leading-none font-bold tabular-nums transition-colors duration-500",
              TONE_TEXT[tone]
            )}
          >
            {formatSeconds(displaySeconds)}
          </div>
          <div className="mt-1.5 flex gap-1">
            {Array.from({ length: SEGMENTS }).map((_, i) => {
              const segStart = i / SEGMENTS;
              const segEnd = (i + 1) / SEGMENTS;
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
                    className={clsx(
                      "h-full rounded-full transition-colors duration-500",
                      TONE_FILL[tone]
                    )}
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

      {previousPick && <PreviousPickPanel previousPick={previousPick} />}
    </div>
  );
}

/** Side of the headshot tile, in px — sized to the header's own height. */
const PORTRAIT_SIZE = 68;

/**
 * The pick that just went in, mirroring the board's own hierarchy: face, then
 * the name with the surname carrying the weight, then the position/NFL-team
 * chip and the fantasy team that took him.
 *
 * Square rather than the round portrait the pool cards use — this sits in a
 * row of hard-edged header blocks, and at this size the circle's crop starts
 * eating shoulders.
 */
function PreviousPickPanel({ previousPick }: { previousPick: PreviousPick }) {
  const { player, teamName } = previousPick;
  // DST "names" are already team names ("Chicago Bears"), which split into a
  // city and a nickname — the same two-tier shape a person's name takes here.
  const name = splitPlayerName(player.fullName);
  const initials =
    player.position === "DST"
      ? (player.nflTeam ?? "")
      : `${name.first.charAt(0)}${name.last.charAt(0)}`.toUpperCase();

  return (
    <div className="flex shrink-0 items-center gap-4 border-white/10 sm:border-l sm:pl-7">
      <PlayerPortrait
        url={player.photoUrl}
        initials={initials}
        size={PORTRAIT_SIZE}
        shape="square"
      />

      <div className="min-w-0">
        <div className="text-[10px] leading-tight font-extrabold tracking-wider text-emerald-400 uppercase">
          Previous pick
        </div>
        {name.first && (
          <div className="truncate text-[15px] leading-tight font-bold uppercase">
            {name.first}
          </div>
        )}
        <div className="truncate text-[28px] leading-none font-black uppercase">
          {name.last}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] leading-none font-extrabold tracking-wide text-black uppercase"
            style={{ background: positionBadgeBackground(player.position) }}
          >
            {player.position}
            {player.nflTeam ? ` · ${player.nflTeam}` : ""}
          </span>
          <span className="truncate text-xs text-white/60">{teamName}</span>
        </div>
      </div>
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
