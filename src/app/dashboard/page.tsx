import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase
    .from("draft_members")
    .select("role, drafts(id, name, season, status, team_count, round_count)")
    .eq("user_id", user?.id ?? "")
    .returns<MembershipRow[]>();

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

      {error && <p className="text-sm text-red-500">{error.message}</p>}

      {!error && (!data || data.length === 0) && (
        <p className="text-sm text-black/60 dark:text-white/60">
          You&apos;re not part of any drafts yet. Create one, or ask a
          commissioner for an invite link.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {data?.map((row) =>
          row.drafts ? (
            <li key={row.drafts.id}>
              <Link
                href={`/draft/${row.drafts.id}/board`}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                <span>
                  <span className="font-bold">{row.drafts.name}</span>
                  <span className="ml-2 text-sm text-black/50 dark:text-white/50">
                    {row.drafts.season} · {row.drafts.team_count} teams ·{" "}
                    {row.drafts.round_count} rounds
                  </span>
                </span>
                <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold uppercase dark:bg-white/10">
                  {row.role}
                </span>
              </Link>
            </li>
          ) : null
        )}
      </ul>
    </div>
  );
}
