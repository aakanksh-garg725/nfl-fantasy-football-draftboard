import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DraftList, type DraftListRow } from "@/components/DraftList";
import { PendingInvites, type PendingInviteRow } from "@/components/PendingInvites";

interface MembershipRow {
  role: "commissioner" | "drafter";
  drafts: {
    id: string;
    name: string;
    season: number;
    status: string;
    team_count: number;
    round_count: number;
  } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data, error }, { data: inviteData }] = await Promise.all([
    supabase
      .from("draft_members")
      .select("role, drafts(id, name, season, status, team_count, round_count)")
      .eq("user_id", user?.id ?? "")
      .returns<MembershipRow[]>(),
    supabase.rpc("list_my_pending_invites") as unknown as Promise<{
      data: { id: string; draft_name: string; team_name: string }[] | null;
    }>,
  ]);

  const rows: DraftListRow[] = (data ?? [])
    .filter((row): row is MembershipRow & { drafts: NonNullable<MembershipRow["drafts"]> } =>
      row.drafts != null
    )
    .map((row) => ({ role: row.role, draft: row.drafts }));

  const inviteRows: PendingInviteRow[] = (inviteData ?? []).map((row) => ({
    id: row.id,
    draftName: row.draft_name,
    teamName: row.team_name,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Drafts</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-bold text-white"
        >
          Create Draft
        </Link>
      </div>

      <PendingInvites rows={inviteRows} userId={user?.id ?? ""} />

      {error && <p className="text-sm text-red-500">{error.message}</p>}

      {!error && <DraftList rows={rows} />}
    </div>
  );
}
