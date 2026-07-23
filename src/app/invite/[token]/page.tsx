import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/components/draft/AcceptInviteButton";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: previewRows } = await supabase.rpc("get_invite_preview", {
    p_token: token,
  });
  const preview = (
    previewRows as { status: string; draft_name: string; team_name: string }[] | null
  )?.[0];

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p>This invite link is invalid.</p>
      </div>
    );
  }

  if (preview.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p>This invite has already been used or revoked.</p>
      </div>
    );
  }

  if (!user) {
    const next = `/invite/${token}`;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <p>
          You&apos;ve been invited to draft as <b>{preview.team_name}</b> in{" "}
          <b>{preview.draft_name}</b>.
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">
          Log in or create an account to accept.
        </p>
        <div className="flex gap-2">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="rounded-md bg-black/5 px-4 py-2 font-bold dark:bg-white/10"
          >
            Log in
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="rounded-md bg-emerald-500 px-4 py-2 font-bold text-white"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p>
        Join <b>{preview.draft_name}</b> as <b>{preview.team_name}</b>?
      </p>
      <AcceptInviteButton token={token} />
    </div>
  );
}
