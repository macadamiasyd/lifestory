"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold text-stone-900">LifeStory</h1>
        <p className="mb-8 text-stone-600">
          Your life, in your words. Sign in to start telling your story.
        </p>

        {sent ? (
          <div className="rounded-lg bg-green-50 p-4 text-green-800">
            <p className="font-medium">Check your email</p>
            <p className="mt-1 text-sm">
              We sent a magic link to <strong>{email}</strong>. Click it to sign
              in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-stone-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mb-4 w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700 transition-colors"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
