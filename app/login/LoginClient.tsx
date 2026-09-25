"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postJSON } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEMO_ACCOUNTS, DEFAULT_PASSWORD } from "@/lib/accounts";
import { ROLE_LABELS } from "@/lib/domain";
import { homeFor } from "@/lib/access";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await postJSON("/api/auth/login", { username, password });
      const dest = next && next !== "/" ? next : homeFor(user.role);
      router.replace(dest);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Sign in failed");
      setBusy(false);
    }
  }

  function fillDemo(u: string) {
    setUsername(u);
    setPassword(DEFAULT_PASSWORD);
    setError(null);
  }

  return (
    <div className="relative grid min-h-screen place-items-center bg-ink-50 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop md:grid md:grid-cols-[1.1fr_1fr]">
        {/* Left — sign-in form */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-900 text-ink-50">
              <Icon name="spool" size={19} />
            </div>
            <div className="leading-none">
              <div className="text-sm font-semibold tracking-tight text-ink-900">
                Fabric Plant
              </div>
              <div className="mt-0.5 text-[11px] text-ink-500">Production Module</div>
            </div>
          </div>

          <h1 className="mt-6 text-xl font-bold tracking-tight text-ink-900">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Use your plant account. Each role lands on its own shop-floor view.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600">
                Username
              </label>
              <input
                className="input !w-full"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. planner"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-600">
                Password
              </label>
              <input
                className="input !w-full"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="alert-danger rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary !w-full justify-center"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
              {!busy && <Icon name="arrowRight" size={15} />}
            </button>
          </form>
        </div>

        {/* Right — demo accounts */}
        <div className="border-t border-ink-100 bg-ink-50/60 p-6 sm:p-8 md:border-l md:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            Demo accounts
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Click any role to fill the form. Shared password:{" "}
            <span className="font-mono font-semibold text-ink-700">
              {DEFAULT_PASSWORD}
            </span>
          </p>
          <div className="mt-3 space-y-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => fillDemo(a.username)}
                className="flex w-full items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900">
                    {ROLE_LABELS[a.role]}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {a.name}
                    {a.stages?.length ? ` · ${a.stages.join(", ")}` : ""}
                  </span>
                </span>
                <span className="ml-3 shrink-0 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-xs text-ink-700">
                  {a.username}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            Placeholder credentials for the showcase — rotate before any real
            deployment.
          </p>
        </div>
      </div>
    </div>
  );
}
