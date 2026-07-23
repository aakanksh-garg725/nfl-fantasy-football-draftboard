import { createClient } from "@/lib/supabase/server";
import {
  mapDraftRow,
  mapPickRow,
  mapTeamRow,
  mapTimerRow,
  mapPlayerRow,
} from "@/lib/draft/mappers";
import { SpectateView } from "@/components/draft/SpectateView";

export default async function SpectatePage({
  params,
}: {
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
    <SpectateView
      initialDraft={mapDraftRow(draftRow)}
      teams={(teamRows ?? []).map(mapTeamRow)}
      initialPicks={(pickRows ?? []).map(mapPickRow)}
      initialTimer={mapTimerRow(timerRow)}
      players={(playerRows ?? []).map(mapPlayerRow)}
      byeWeeksByTeam={new Map((byeWeekRows ?? []).map((r) => [r.nfl_team, r.bye_week]))}
    />
  );
}
