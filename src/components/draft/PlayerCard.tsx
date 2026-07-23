import clsx from "clsx";
import type { Player } from "@/lib/draft/types";
import { positionCardBackground } from "@/lib/draft/positionStyle";

export interface PlayerCardProps {
  player: Player;
  byeWeek: number | null;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The shared player card: team abbr top-left, position top-right, name
 * centered/largest, bye week bottom-right. Defense (DST) cards omit the
 * top-left team abbr since the team name already occupies the name slot.
 */
export function PlayerCard({
  player,
  byeWeek,
  onClick,
  disabled,
  className,
}: PlayerCardProps) {
  const isDst = player.position === "DST";
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      style={{ background: positionCardBackground(player.position) }}
      className={clsx(
        "flex aspect-[4/3] w-full flex-col justify-between rounded-lg border border-black/10 p-2 text-left shadow-sm transition dark:border-white/10",
        onClick && !disabled && "cursor-pointer hover:brightness-95",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <div className="flex items-start justify-between text-[10px] font-bold tracking-wide uppercase opacity-70">
        <span>{isDst ? "" : (player.nflTeam ?? "FA")}</span>
        <span>{player.position}</span>
      </div>

      <div className="flex flex-1 items-center justify-center px-1 text-center">
        <span className="text-sm leading-tight font-extrabold sm:text-base">
          {isDst ? nameForDst(player) : player.fullName}
        </span>
      </div>

      <div className="flex items-center justify-end text-[10px] font-semibold opacity-70">
        {byeWeek ? `BYE ${byeWeek}` : ""}
      </div>
    </Wrapper>
  );
}

function nameForDst(player: Player): string {
  // player.fullName is pre-formatted as the team name at import time
  return player.fullName;
}
