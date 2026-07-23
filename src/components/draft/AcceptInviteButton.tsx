"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: draftId, error } = await supabase.rpc("accept_invite", {
      p_token: token,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/draft/${draftId}/board`);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={handleAccept}
        className="rounded-md bg-emerald-500 px-6 py-2 font-bold text-white disabled:opacity-50"
      >
        {loading ? "Joining…" : "Accept & join"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
