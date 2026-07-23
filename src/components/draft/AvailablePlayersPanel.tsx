"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { POSITIONS, type Player, type Position } from "@/lib/draft/types";
import { getLastName } from "@/lib/draft/playerName";
import { PlayerCard } from "./PlayerCard";

// Must match PlayerCard's fixed height (h-20 = 80px) plus the row gap.
const CARD_HEIGHT = 80;
const ROW_GAP = 8;
const ROW_HEIGHT = CARD_HEIGHT + ROW_GAP;

/** Column count mirrors the Tailwind breakpoints the grid used to render at. */
function useColumnCount() {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      if (width >= 1024) setColumns(5);
      else if (width >= 768) setColumns(4);
      else if (width >= 640) setColumns(3);
      else setColumns(2);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

export interface AvailablePlayersPanelProps {
  players: Player[];
  byeWeeksByTeam: Map<string, number>;
  /** playerId -> team name, for players already drafted (shown blurred, not excluded). */
  draftedByPlayerId?: Map<string, string>;
  canDraft: boolean;
  onDraftPlayer?: (playerId: string) => void;
}

export function AvailablePlayersPanel({
  players,
  byeWeeksByTeam,
  draftedByPlayerId,
  canDraft,
  onDraftPlayer,
}: AvailablePlayersPanelProps) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "ALL">(
    "ALL"
  );
  const columnCount = useColumnCount();
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => {
        if (positionFilter !== "ALL" && p.position !== positionFilter)
          return false;
        if (term && !p.fullName.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) =>
        getLastName(a.fullName).localeCompare(getLastName(b.fullName))
      );
  }, [players, search, positionFilter]);

  const rowCount = Math.ceil(filtered.length / columnCount);

  // eslint-disable-next-line react-hooks/incompatible-library -- react-compiler is not enabled in this project
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-white/5"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            label="All"
            active={positionFilter === "ALL"}
            onClick={() => setPositionFilter("ALL")}
          />
          {POSITIONS.map((pos) => (
            <FilterChip
              key={pos}
              label={pos}
              active={positionFilter === pos}
              onClick={() => setPositionFilter(pos)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-black/50 dark:text-white/50">
        {filtered.length} player{filtered.length === 1 ? "" : "s"}
      </p>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-black/40 dark:text-white/40">
            No players match.
          </div>
        ) : (
          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * columnCount;
              const rowPlayers = filtered.slice(start, start + columnCount);
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: CARD_HEIGHT,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gap: "0.5rem",
                  }}
                >
                  {rowPlayers.map((player) => {
                    const byeWeek = player.nflTeam
                      ? (byeWeeksByTeam.get(player.nflTeam) ?? null)
                      : null;
                    const draftedByTeamName = draftedByPlayerId?.get(player.id);
                    return (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        byeWeek={byeWeek}
                        disabled={!canDraft}
                        draftedByTeamName={draftedByTeamName}
                        onClick={
                          onDraftPlayer
                            ? () => onDraftPlayer(player.id)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase transition",
        active
          ? "bg-emerald-500 text-white"
          : "bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
      )}
    >
      {label}
    </button>
  );
}
