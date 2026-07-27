"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "@/lib/draft/types";
import { getLastName } from "@/lib/draft/playerName";
import { positionBadgeBackground } from "@/lib/draft/positionStyle";

export interface DraftSearchBarProps {
  players: Player[];
  /** playerId -> team name, for players already drafted (excluded from results). */
  draftedByPlayerId: Map<string, string>;
  byeWeeksByTeam: Map<string, number>;
  canDraft: boolean;
  onDraftPlayer: (playerId: string) => void;
}

const MAX_RESULTS = 8;

/**
 * Search-to-draft box for the header bar: lets whoever's on the clock (or the
 * commissioner) find and draft a player without leaving the Draft Board for
 * the Available Players tab. Disabled rather than hidden when it isn't your
 * turn, so browsing still works — same "search now, draft on your turn"
 * pattern as the Available Players page.
 */
export function DraftSearchBar({
  players,
  draftedByPlayerId,
  byeWeeksByTeam,
  canDraft,
  onDraftPlayer,
}: DraftSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return players
      .filter((p) => !draftedByPlayerId.has(p.id))
      .filter((p) => p.fullName.toLowerCase().includes(term))
      .sort((a, b) => getLastName(a.fullName).localeCompare(getLastName(b.fullName)))
      .slice(0, MAX_RESULTS);
  }, [players, query, draftedByPlayerId]);

  function handleSelect(playerId: string) {
    onDraftPlayer(playerId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-sm flex-1">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={canDraft ? "Search & draft a player…" : "Search players…"}
        className="w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-emerald-400"
      />

      {open && query.trim() && (
        <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-black/10 bg-white text-left shadow-lg dark:border-white/10 dark:bg-neutral-900">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-black/40 dark:text-white/40">
              No players match.
            </div>
          ) : (
            results.map((player) => {
              const byeWeek = player.nflTeam
                ? (byeWeeksByTeam.get(player.nflTeam) ?? null)
                : null;
              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={!canDraft}
                  onClick={() => handleSelect(player.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-black hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:hover:bg-white/10"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black tracking-wide text-black uppercase"
                      style={{ background: positionBadgeBackground(player.position) }}
                    >
                      {player.position}
                    </span>
                    <span className="truncate font-semibold">{player.fullName}</span>
                  </span>
                  <span className="shrink-0 text-xs text-black/40 dark:text-white/40">
                    {player.nflTeam ?? "FA"}
                    {byeWeek ? ` · BYE ${byeWeek}` : ""}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
