"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p className="max-w-sm text-sm text-black/70 dark:text-white/70">
          Check your email ({email}) for a confirmation link, then log in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-black/10 p-6 dark:border-white/10"
      >
        <h1 className="mb-6 text-xl font-bold">Create an account</h1>

        <label className="mb-3 block text-sm">
          Display name
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
          />
        </label>

        <label className="mb-3 block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
          />
        </label>

        <label className="mb-4 block text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-500 py-2 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          Already have an account?{" "}
          <Link
            href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
