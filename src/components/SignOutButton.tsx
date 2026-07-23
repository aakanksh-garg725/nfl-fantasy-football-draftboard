"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-md bg-black/5 px-3 py-1.5 text-sm font-semibold hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
    >
      Sign out
    </button>
  );
}
