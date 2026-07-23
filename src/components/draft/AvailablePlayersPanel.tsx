"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { POSITIONS, type Player, type Position } from "@/lib/draft/types";
import { PlayerCard } from "./PlayerCard";

export interface AvailablePlayersPanelProps {
  players: Player[];
  byeWeeksByTeam: Map<string, number>;
  canDraft: boolean;
  onDraftPlayer?: (playerId: string) => void;
}

export function AvailablePlayersPanel({
  players,
  byeWeeksByTeam,
  canDraft,
  onDraftPlayer,
}: AvailablePlayersPanelProps) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<Position | "ALL">(
    "ALL"
  );

  // Rendering the full ~1000-player pool as cards at once is enough DOM to
  // visibly stall the page, and a search/filter is always available to
  // narrow it — so cap how many cards mount at a time.
  const MAX_RENDERED = 60;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players.filter((p) => {
      if (positionFilter !== "ALL" && p.position !== positionFilter)
        return false;
      if (term && !p.fullName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [players, search, positionFilter]);

  const visible = filtered.slice(0, MAX_RENDERED);

  return (
    <div className="flex h-full flex-col gap-3">
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

      {filtered.length > MAX_RENDERED && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Showing {MAX_RENDERED} of {filtered.length} — refine your search or
          position filter to narrow it down.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((player) => {
          const byeWeek = player.nflTeam
            ? (byeWeeksByTeam.get(player.nflTeam) ?? null)
            : null;
          return (
            <PlayerCard
              key={player.id}
              player={player}
              byeWeek={byeWeek}
              disabled={!canDraft}
              onClick={
                onDraftPlayer ? () => onDraftPlayer(player.id) : undefined
              }
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-black/40 dark:text-white/40">
            No players match.
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
