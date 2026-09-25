"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getJSON, postJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { StatusBadge, PriorityBadge, DeliveryBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import {
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  WO_TRANSITIONS,
  canRoleTransition,
  type Role,
  type WoStatus,
} from "@/lib/domain";
import { canCreateWorkOrder } from "@/lib/access";
import { JobBoardTabs } from "../JobBoardTabs";
import { type JobWo, daysLeftLabel } from "../board-utils";

/** Short "where on the floor" descriptor derived from lifecycle status. */
const STATUS_STAGE: Record<WoStatus, string> = {
  Created: "Planning",
  Sampling: "Sampling / approval",
  PreProductionReview: "Pre-production",
  InProduction: "On the floor",
  InInspection: "Inspection / QC",
  PackingDispatch: "Packing & dispatch",
  Closed: "Closed",
};

/** Statuses that count as actively on the shop floor. */
const ON_FLOOR: WoStatus[] = [
  "PreProductionReview",
  "InProduction",
  "InInspection",
  "PackingDispatch",
];

type Tab = "floor" | "held" | "completed" | "all";

const isFloor = (w: JobWo) => ON_FLOOR.includes(w.status);
const isHeld = (w: JobWo) => w.status !== "Closed" && w.priority !== "Normal";
const isDone = (w: JobWo) => w.status === "Closed";

export default function CockpitClient({ initial }: { initial: JobWo[] | null }) {
  const { role } = useRole();
  const { data, error, loading, reload } = useAsync<JobWo[]>(
    () => getJSON("/api/work-orders"),
    [],
    { cacheKey: "/api/work-orders", initialData: initial ?? undefined }
  );

  const [tab, setTab] = useState<Tab>("floor");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => data || [], [data]);

  const buckets = useMemo(
    () => ({
      floor: all.filter(isFloor),
      held: all.filter(isHeld),
      completed: all.filter(isDone),
      all,
    }),
    [all]
  );

  const running = buckets.floor.length;

  async function move(woId: string, to: WoStatus, from: WoStatus) {
    if (to === from) return;
    setBusy(true);
    setToast(null);
    try {
      await postJSON(`/api/work-orders/${woId}/transition`, { to });
      await reload();
    } catch (e: any) {
      setToast(e?.message || "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return buckets[tab];
    return buckets[tab].filter((w) =>
      `${w.woNo} ${w.productName} ${w.sku ?? ""} ${w.customerRef}`
        .toLowerCase()
        .includes(needle)
    );
  }, [buckets, tab, q]);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "floor", label: "On the floor", count: buckets.floor.length },
    { key: "held", label: "Held / exception", count: buckets.held.length },
    { key: "completed", label: "Completed", count: buckets.completed.length },
    { key: "all", label: "All", count: all.length },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="WIP Cockpit"
        subtitle="Live shop-floor view of every work-in-progress job, with one-tap stage actions."
        action={
          canCreateWorkOrder(role) ? (
            <Link href="/work-orders/new" className="btn-primary">
              <Icon name="plus" size={16} />
              New Work Order
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <JobBoardTabs />
        <button className="btn-ghost btn-sm" onClick={reload} disabled={busy || loading}>
          <Icon name="refresh" size={15} />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toast}
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile n={running} label="Running" accent="#3b82f6" />
        <Tile n={buckets.held.length} label="Held / exception" accent="#f59e0b" />
        <Tile n={buckets.completed.length} label="Completed" accent="#1c6f63" />
        <Tile n={all.length} label="Total WIP records" accent="#334155" />
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t.key
                  ? "bg-ink-900 text-ink-50"
                  : "border border-ink-200 bg-white text-ink-600 hover:bg-ink-100"
              }`}
            >
              {t.label}
              <span
                className={`rounded px-1.5 text-xs tabular-nums ${
                  tab === t.key ? "bg-ink-50/20 text-ink-50" : "bg-ink-100 text-ink-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs sm:flex-none">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400">
            <Icon name="trace" size={15} />
          </span>
          <input
            className="input !w-full !pl-8 !pr-8"
            placeholder="Search WO#, product, customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
              title="Clear search"
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <DataGate loading={loading} error={error} onReload={reload}>
        {cards.length === 0 ? (
          <div className="card py-16 text-center text-sm text-ink-400">
            {q ? `No jobs match “${q}”.` : "No jobs in this view."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((w) => (
              <JobCard key={w._id} w={w} busy={busy} move={move} role={role} />
            ))}
          </div>
        )}
      </DataGate>
    </div>
  );
}

function Tile({ n, label, accent }: { n: number; label: string; accent: string }) {
  return (
    <div
      className="card p-4"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="text-3xl font-bold tabular-nums text-ink-900">{n}</div>
      <div className="mt-0.5 text-sm font-medium text-ink-600">{label}</div>
    </div>
  );
}

function JobCard({
  w,
  busy,
  move,
  role,
}: {
  w: JobWo;
  busy: boolean;
  move: (id: string, to: WoStatus, from: WoStatus) => void;
  role: Role | null;
}) {
  const dl = daysLeftLabel(w);
  const transitions = WO_TRANSITIONS[w.status];
  return (
    <div
      className="card overflow-hidden"
      style={{ borderTop: `3px solid ${WO_STATUS_COLORS[w.status]}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/work-orders/${w._id}`}
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              {w.woNo}
            </Link>
            <StatusBadge status={w.status} />
            <PriorityBadge priority={w.priority} />
          </div>
          <span className={`text-xs ${dl.tone}`}>{dl.label}</span>
        </div>

        <div className="mt-2 text-sm font-medium text-ink-900">
          {w.productName}
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <Meta k="Customer" v={w.customerRef} />
          <Meta k="Qty" v={`${fmtNum(w.targetQty)} ${w.unit}`} />
          <Meta k="Stage" v={STATUS_STAGE[w.status]} />
        </dl>

        <div className="mt-3 flex items-center justify-between gap-2">
          <DeliveryBadge dueDate={w.dueDate} />
          <span className="text-[11px] text-ink-500">Due {fmtDate(w.dueDate)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {transitions.length === 0 ? (
            <span className="badge bg-brand-50 text-brand-700">Complete</span>
          ) : (
            transitions.map((to) => {
              const allowed = canRoleTransition(role, w.status, to);
              return (
                <button
                  key={to}
                  disabled={busy || !allowed}
                  onClick={() => move(w._id, to, w.status)}
                  className="btn-ghost btn-sm !py-1"
                  title={
                    allowed
                      ? `Move to ${WO_STATUS_LABELS[to]}`
                      : `Only the owning role can move to ${WO_STATUS_LABELS[to]}`
                  }
                >
                  <Icon name="chevronRight" size={13} />
                  {WO_STATUS_LABELS[to]}
                  {!allowed && " (locked)"}
                </button>
              );
            })
          )}
        </div>
        <Link
          href={`/work-orders/${w._id}`}
          className="btn-ghost btn-sm !py-1 whitespace-nowrap"
        >
          Pipeline
          <Icon name="arrowRight" size={13} />
        </Link>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-ink-400">{k}</dt>
      <dd className="truncate font-medium text-ink-800">{v}</dd>
    </div>
  );
}
