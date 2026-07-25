"use client";

import clsx from "clsx";
import type { Player } from "@/lib/draft/types";
import {
  positionBadgeBackground,
  positionCardBackground,
} from "@/lib/draft/positionStyle";
import { splitPlayerName } from "@/lib/draft/playerName";

export type PlayerCardVariant = "board" | "pool";

export interface PlayerCardProps {
  player: Player;
  byeWeek: number | null;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  /** When set, the card is shown blurred with a "DRAFTED by ..." overlay and is never clickable. */
  draftedByTeamName?: string | null;
  /**
   * How loudly the card states itself.
   *
   * `board` is the scanning view: 200+ cells at once, where anything beyond the
   * name is supporting detail and every extra bit of weight is noise. `pool` is
   * the deciding view — you're reading one player at a time and the team, bye,
   * and position are what you're weighing, so they're sized to be read rather
   * than merely present.
   */
  variant?: PlayerCardVariant;
}

/**
 * The shared player card: team abbr top-left, position top-right, name, bye
 * week bottom-right. Defense (DST) cards omit the top-left team abbr since the
 * team name already occupies the name slot.
 *
 * Board cells keep the full name on one line at one size — that's what makes a
 * board scannable. Pool cards split the name across two tiers and left-align
 * the block, which is the same hierarchy the header's previous-pick panel uses.
 */
export function PlayerCard({
  player,
  byeWeek,
  onClick,
  disabled,
  className,
  draftedByTeamName,
  variant = "board",
}: PlayerCardProps) {
  const isDst = player.position === "DST";
  const isPool = variant === "pool";
  const isDrafted = Boolean(draftedByTeamName);
  const clickable = onClick && !isDrafted;
  const Wrapper = clickable ? "button" : "div";
  // DST "names" are team names, which split into a city and a nickname — the
  // same two-tier shape a person's name takes, so the pool treats them alike.
  const name = isPool
    ? splitPlayerName(player.fullName)
    : { first: "", last: player.fullName };

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
          "relative h-full w-full transition",
          isDrafted && "blur-[2px]"
        )}
      >
        {isPool ? (
          // Tighter vertical padding than the board's cells: three stacked
          // rows at pool weight need the millimetres, and the card's own border
          // already reads as the edge without help from whitespace.
          <div className="flex h-full w-full flex-col px-2 py-1.5">
            {/* The detail line the board only whispers: NFL team at full
                strength, and the position as a solid chip in its own colour so
                it registers before the name does when you're filtering by eye. */}
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] font-black tracking-wider uppercase opacity-80">
                {isDst ? "" : (player.nflTeam ?? "FA")}
              </span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none font-black tracking-wide text-black uppercase"
                style={{ background: positionBadgeBackground(player.position) }}
              >
                {player.position}
              </span>
            </div>

            {/* Takes the space between the two label rows and centres in it, so
                the name sits where the headshot used to rather than leaving a
                band of empty tint. The column is only as wide as the surname,
                so centring the text centres the first name over it. */}
            <div className="flex flex-1 items-center justify-center px-1 text-center leading-tight">
              <div className="min-w-0">
                {name.first && (
                  <div className="truncate text-[11px] font-semibold opacity-75">
                    {name.first}
                  </div>
                )}
                <div className="truncate text-lg leading-tight font-black">
                  {name.last}
                </div>
              </div>
            </div>

            {/* Rendered even when there's no bye (free agents), so the name
                band is the same height on every card in a row. */}
            <div className="text-right text-[10px] leading-tight font-extrabold opacity-70">
              {byeWeek ? `BYE ${byeWeek}` : ""}
            </div>
          </div>
        ) : (
          <div className="relative flex h-full w-full flex-col justify-between p-2">
            <div className="flex items-start justify-between text-[10px] font-bold tracking-wide uppercase opacity-70">
              <span>{isDst ? "" : (player.nflTeam ?? "FA")}</span>
              <span>{player.position}</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-1 text-center leading-tight">
              <span className="text-xs font-extrabold break-words sm:text-sm">
                {name.last}
              </span>
            </div>

            <div className="flex items-center justify-end text-[10px] font-semibold opacity-70">
              {byeWeek ? `BYE ${byeWeek}` : ""}
            </div>
          </div>
        )}
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
