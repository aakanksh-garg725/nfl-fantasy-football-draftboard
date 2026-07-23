import clsx from "clsx";
import type { Player } from "@/lib/draft/types";
import { positionCardBackground } from "@/lib/draft/positionStyle";

export interface PlayerCardProps {
  player: Player;
  byeWeek: number | null;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** When set, the card is shown blurred with a "DRAFTED by ..." overlay and is never clickable. */
  draftedByTeamName?: string | null;
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
  draftedByTeamName,
}: PlayerCardProps) {
  const isDst = player.position === "DST";
  const isDrafted = Boolean(draftedByTeamName);
  const clickable = onClick && !isDrafted;
  const Wrapper = clickable ? "button" : "div";

  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      disabled={clickable ? disabled : undefined}
      className={clsx(
        "relative h-20 w-full overflow-hidden rounded-lg border border-black/10 text-left shadow-sm dark:border-white/10",
        clickable && !disabled && "cursor-pointer hover:brightness-95",
        !clickable && "cursor-default",
        disabled && !isDrafted && "opacity-60",
        className
      )}
    >
      <div
        style={{ background: positionCardBackground(player.position) }}
        className={clsx(
          "flex h-full w-full flex-col justify-between p-2 transition",
          isDrafted && "blur-[2px]"
        )}
      >
        <div className="flex items-start justify-between text-[10px] font-bold tracking-wide uppercase opacity-70">
          <span>{isDst ? "" : (player.nflTeam ?? "FA")}</span>
          <span>{player.position}</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-1 text-center">
          <span className="text-xs leading-tight font-extrabold sm:text-sm">
            {isDst ? nameForDst(player) : player.fullName}
          </span>
        </div>

        <div className="flex items-center justify-end text-[10px] font-semibold opacity-70">
          {byeWeek ? `BYE ${byeWeek}` : ""}
        </div>
      </div>

      {isDrafted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-2 text-center text-[11px] leading-tight font-bold text-white">
          DRAFTED
          <br />
          by {draftedByTeamName}
        </div>
      )}
    </Wrapper>
  );
}

function nameForDst(player: Player): string {
  // player.fullName is pre-formatted as the team name at import time
  return player.fullName;
}
