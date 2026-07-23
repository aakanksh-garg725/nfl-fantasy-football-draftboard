import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  mapDraftRow,
  mapPickRow,
  mapTeamRow,
  mapTimerRow,
  mapPlayerRow,
} from "@/lib/draft/mappers";
import { DraftProvider } from "@/components/draft/DraftProvider";
import { DraftNav } from "@/components/draft/DraftNav";

export default async function DraftLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: draftRow },
    { data: teamRows },
    { data: pickRows },
    { data: timerRow },
    { data: playerRows },
    { data: byeWeekRows },
    { data: memberRow },
  ] = await Promise.all([
    supabase.from("drafts").select("*").eq("id", draftId).maybeSingle(),
    supabase.from("teams").select("*").eq("draft_id", draftId).order("slot_number"),
    supabase.from("picks").select("*").eq("draft_id", draftId),
    supabase.from("draft_timer").select("*").eq("draft_id", draftId).maybeSingle(),
    supabase.from("players").select("*"),
    supabase.from("team_bye_weeks").select("*"),
    supabase
      .from("draft_members")
      .select("role, team_id")
      .eq("draft_id", draftId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!draftRow || !timerRow) notFound();

  const byeWeeksByTeam = new Map(
    (byeWeekRows ?? []).map((r) => [r.nfl_team, r.bye_week])
  );

  return (
    <DraftProvider
      initial={{
        draft: mapDraftRow(draftRow),
        teams: (teamRows ?? []).map(mapTeamRow),
        picks: (pickRows ?? []).map(mapPickRow),
        timer: mapTimerRow(timerRow),
        players: (playerRows ?? []).map(mapPlayerRow),
        byeWeeksByTeam,
        currentUserId: user.id,
        myRole: memberRow?.role ?? null,
        myTeamId: memberRow?.team_id ?? null,
      }}
    >
      <div className="flex min-h-screen flex-col">
        <DraftNav draftId={draftId} isCommissioner={memberRow?.role === "commissioner"} />
        {children}
      </div>
    </DraftProvider>
  );
}
