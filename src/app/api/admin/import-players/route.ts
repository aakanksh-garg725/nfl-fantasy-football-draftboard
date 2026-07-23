import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Position } from "@/lib/draft/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SleeperPlayer {
  player_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  active?: boolean;
}

const FANTASY_POSITIONS = new Set(["QB", "RB", "WR", "TE", "K"]);

/**
 * Re-runnable player import from Sleeper's free public API. Upserts on `id`,
 * so trades/inactivity naturally update in place on re-import — no diffing
 * needed. Sleeper already includes one synthetic "DEF" entry per NFL team
 * (player_id = team abbreviation), which we map straight onto our DST rows
 * rather than synthesizing our own.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_IMPORT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sleeperRes = await fetch("https://api.sleeper.app/v1/players/nfl");
  if (!sleeperRes.ok) {
    return NextResponse.json(
      { error: `Sleeper API responded ${sleeperRes.status}` },
      { status: 502 }
    );
  }
  const sleeperData: Record<string, SleeperPlayer> = await sleeperRes.json();

  const rows: {
    id: string;
    full_name: string;
    position: Position;
    nfl_team: string;
    active: boolean;
    photo_url: string | null;
    metadata: SleeperPlayer;
  }[] = [];

  for (const player of Object.values(sleeperData)) {
    if (!player.team) continue;

    if (player.position === "DEF") {
      rows.push({
        id: `DST_${player.team}`,
        full_name: player.full_name ?? `${player.first_name} ${player.last_name}`,
        position: "DST",
        nfl_team: player.team,
        active: true,
        photo_url: null,
        metadata: player,
      });
      continue;
    }

    if (!player.position || !FANTASY_POSITIONS.has(player.position)) continue;

    rows.push({
      id: player.player_id,
      full_name: player.full_name ?? `${player.first_name} ${player.last_name}`,
      position: player.position as Position,
      nfl_team: player.team,
      active: player.active ?? true,
      photo_url: `https://sleepercdn.com/content/nfl/players/${player.player_id}.jpg`,
      metadata: player,
    });
  }

  const admin = createAdminClient();
  const batchSize = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await admin.from("players").upsert(batch, { onConflict: "id" });
    if (error) {
      return NextResponse.json(
        { error: error.message, upsertedSoFar: upserted },
        { status: 500 }
      );
    }
    upserted += batch.length;
  }

  const byPosition = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.position] = (acc[r.position] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ imported: upserted, byPosition });
}
