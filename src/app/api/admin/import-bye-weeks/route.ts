import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import byeWeeks2026 from "../../../../../data/bye-weeks-2026.json";

export const runtime = "nodejs";

/**
 * Seeds team_bye_weeks from the static compiled schedule file. Bye weeks
 * don't change once a season's schedule is published, so this isn't a live
 * fetch — just a one-time (or per-season) seed of data/bye-weeks-*.json.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_IMPORT_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = Object.entries(byeWeeks2026.byeWeeks).map(([nflTeam, byeWeek]) => ({
    nfl_team: nflTeam,
    season: byeWeeks2026.season,
    bye_week: byeWeek,
  }));

  const admin = createAdminClient();
  const { error } = await admin
    .from("team_bye_weeks")
    .upsert(rows, { onConflict: "nfl_team,season" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ imported: rows.length, season: byeWeeks2026.season });
}
