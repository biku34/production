"use client";

import { useState } from "react";
import { postJSON } from "@/lib/client";

/**
 * Wraps a page body. On the most common demo error — the DB not being reachable
 * because MONGODB_URI is still the placeholder — it shows setup guidance plus a
 * one-click seed button instead of a raw stack trace.
 */
export function DataGate({
  loading,
  error,
  onReload,
  children,
}: {
  loading: boolean;
  error: string | null;
  onReload: () => void;
  children: React.ReactNode;
}) {
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-500 text-sm">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (error) {
    const looksLikeDb =
      /MONGODB_URI|ENOTFOUND|querySrv|ECONNREFUSED|authentication|topology|timed out|placeholder/i.test(
        error
      );
    return (
      <div className="card p-6 max-w-2xl">
        <h3 className="text-base font-semibold text-red-600">
          {looksLikeDb ? "Database not connected" : "Couldn’t load data"}
        </h3>
        <p className="mt-2 text-sm text-ink-700">{error}</p>
        {looksLikeDb && (
          <div className="mt-4 text-sm text-ink-700 space-y-2">
            <p>To connect the app to MongoDB Atlas:</p>
            <ol className="list-decimal ml-5 space-y-1 text-ink-700">
              <li>
                Create a free cluster at{" "}
                <span className="font-mono">cloud.mongodb.com</span>.
              </li>
              <li>
                Cluster → <b>Connect</b> → <b>Drivers</b> → copy the SRV string.
              </li>
              <li>
                Paste it into <span className="font-mono">.env.local</span> as{" "}
                <span className="font-mono">MONGODB_URI</span> and restart{" "}
                <span className="font-mono">npm run dev</span>.
              </li>
              <li>Then click “Seed demo data” below.</li>
            </ol>
          </div>
        )}
        <div className="mt-5 flex items-center gap-2">
          <button className="btn-ghost" onClick={onReload}>
            Retry
          </button>
          <button
            className="btn-primary"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              setSeedMsg(null);
              try {
                const r = await postJSON("/api/seed", {});
                setSeedMsg(
                  `Seeded ${r.workOrders?.length ?? 0} work orders. Reloading…`
                );
                setTimeout(onReload, 800);
              } catch (e: any) {
                setSeedMsg(e?.message || "Seed failed");
              } finally {
                setSeeding(false);
              }
            }}
          >
            {seeding ? "Seeding…" : "Seed demo data"}
          </button>
        </div>
        {seedMsg && <p className="mt-3 text-sm text-ink-700">{seedMsg}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
