"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-black/10 p-6 dark:border-white/10"
      >
        <h1 className="mb-6 text-xl font-bold">Log in</h1>

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
          {loading ? "Logging in…" : "Log in"}
        </button>

        <p className="mt-4 text-center text-sm text-black/60 dark:text-white/60">
          Need an account?{" "}
          <Link
            href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
