import { createClient } from "@/lib/supabase/server";
import {
  mapDraftRow,
  mapPickRow,
  mapTeamRow,
  mapTimerRow,
  mapPlayerRow,
} from "@/lib/draft/mappers";
import { SpectateProvider } from "@/components/draft/SpectateProvider";
import { SpectateNav } from "@/components/draft/SpectateNav";

export default async function SpectateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const supabase = await createClient();

  const { data: draftRow } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .eq("spectator_enabled", true)
    .maybeSingle();

  if (!draftRow) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p>This draft isn&apos;t available for spectating.</p>
      </div>
    );
  }

  const [
    { data: teamRows },
    { data: pickRows },
    { data: timerRow },
    { data: playerRows },
    { data: byeWeekRows },
  ] = await Promise.all([
    supabase.from("teams").select("*").eq("draft_id", draftId).order("slot_number"),
    supabase.from("picks").select("*").eq("draft_id", draftId),
    supabase.from("draft_timer").select("*").eq("draft_id", draftId).maybeSingle(),
    supabase.from("players").select("*"),
    supabase.from("team_bye_weeks").select("*"),
  ]);

  if (!timerRow) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p>This draft isn&apos;t set up yet.</p>
      </div>
    );
  }

  return (
    <SpectateProvider
      initial={{
        draft: mapDraftRow(draftRow),
        teams: (teamRows ?? []).map(mapTeamRow),
        picks: (pickRows ?? []).map(mapPickRow),
        timer: mapTimerRow(timerRow),
        players: (playerRows ?? []).map(mapPlayerRow),
        byeWeeksByTeam: new Map((byeWeekRows ?? []).map((r) => [r.nfl_team, r.bye_week])),
      }}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        <SpectateNav draftId={draftId} />
        {children}
      </div>
    </SpectateProvider>
  );
}
