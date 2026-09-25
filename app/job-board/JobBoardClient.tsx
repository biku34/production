"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { getJSON, postJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { DeliveryBadge, PriorityBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  WO_TRANSITIONS,
  STAGE_TO_STATUS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";

export interface Wo {
  _id: string;
  woNo: string;
  productName: string;
  customerRef: string;
  targetQty: number;
  unit: string;
  status: WoStatus;
  priority: string;
  dueDate?: string;
}

const SHORT: Record<WoStatus, string> = {
  Created: "Created",
  Sampling: "Sampling",
  PreProductionReview: "Pre-prod",
  InProduction: "Production",
  InInspection: "Inspection",
  PackingDispatch: "Packing",
  Closed: "Closed",
};

export default function JobBoardClient({ initial }: { initial: Wo[] | null }) {
  const { role, stage } = useRole();
  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON("/api/work-orders"),
    [],
    { cacheKey: "/api/work-orders", initialData: initial ?? undefined }
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scopedStatus =
    role === "StageSupervisor" && stage ? STAGE_TO_STATUS[stage] : null;
  const visibleStatuses = scopedStatus
    ? [scopedStatus]
    : (WO_STATUSES as readonly WoStatus[]);

  async function move(woId: string, to: WoStatus, from: WoStatus) {
    if (to === from) return;
    setBusy(true);
    setToast(null);
    try {
      await postJSON(`/api/work-orders/${woId}/transition`, { to, byName: role });
      await reload();
    } catch (e: any) {
      setToast(e?.message || "Transition failed");
    } finally {
      setBusy(false);
      setDragId(null);
    }
  }

  const grouped = (status: WoStatus) =>
    (data || []).filter((w) => w.status === status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Production Job Board"
        subtitle={
          scopedStatus
            ? `Scoped to ${STAGE_LABELS[stage!]} supervisor — showing “${WO_STATUS_LABELS[scopedStatus]}” only.`
            : "Track every work order across the fabric production lifecycle."
        }
        action={
          <Link href="/work-orders/new" className="btn-primary">
            <Icon name="plus" size={16} />
            New Work Order
          </Link>
        }
      />

      {toast && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toast}
        </div>
      )}

      <DataGate loading={loading} error={error} onReload={reload}>
        {!scopedStatus && (
          <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 md:hidden">
            {WO_STATUSES.map((s, i) => (
              <Fragment key={s}>
                <div className="flex shrink-0 flex-col items-center rounded-lg border border-ink-200 bg-white px-3 py-1.5">
                  <span
                    className="text-base font-semibold tabular-nums"
                    style={{ color: WO_STATUS_COLORS[s as WoStatus] }}
                  >
                    {grouped(s as WoStatus).length}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-ink-500">
                    {SHORT[s as WoStatus]}
                  </span>
                </div>
                {i < WO_STATUSES.length - 1 && (
                  <Icon
                    name="chevronRight"
                    size={14}
                    className="shrink-0 self-center text-ink-300"
                  />
                )}
              </Fragment>
            ))}
          </div>
        )}

        <div className="space-y-5 md:hidden">
          {visibleStatuses.map((status) => {
            const cards = grouped(status);
            return (
              <section key={status}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: WO_STATUS_COLORS[status] }}
                  />
                  <h3 className="text-sm font-semibold text-ink-900">
                    {WO_STATUS_LABELS[status]}
                  </h3>
                  <span className="badge bg-ink-100 text-ink-600">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.map((w) => (
                    <WoCard key={w._id} w={w} busy={busy} move={move} />
                  ))}
                  {cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-ink-200 py-3 text-center text-xs text-ink-400">
                      No jobs
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="hidden gap-3 overflow-x-auto pb-4 md:flex">
          {visibleStatuses.map((status) => {
            const cards = grouped(status);
            return (
              <div
                key={status}
                className={`flex min-w-[260px] flex-1 flex-col overflow-hidden rounded-xl border bg-ink-50/50 ${
                  dragId ? "border-brand-200" : "border-ink-200"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId) return;
                  const card = data?.find((w) => w._id === dragId);
                  if (card) move(dragId, status, card.status);
                }}
              >
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: WO_STATUS_COLORS[status] }}
                />
                <div className="flex items-center justify-between border-b border-ink-200 px-3 py-2.5">
                  <span className="text-sm font-semibold text-ink-900">
                    {WO_STATUS_LABELS[status]}
                  </span>
                  <span className="badge bg-white text-ink-500 ring-1 ring-inset ring-ink-200">
                    {cards.length}
                  </span>
                </div>
                <div className="min-h-[240px] flex-1 space-y-2 p-2">
                  {cards.map((w) => (
                    <WoCard
                      key={w._id}
                      w={w}
                      busy={busy}
                      move={move}
                      draggable
                      onDragStart={() => setDragId(w._id)}
                      onDragEnd={() => setDragId(null)}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="py-8 text-center text-xs text-ink-400">
                      No jobs
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DataGate>
    </div>
  );
}

function WoCard({
  w,
  busy,
  move,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  w: Wo;
  busy: boolean;
  move: (id: string, to: WoStatus, from: WoStatus) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable={draggable && !busy}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`card p-3 ${
        draggable ? "cursor-grab hover:shadow-pop active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/work-orders/${w._id}`}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          {w.woNo}
        </Link>
        <PriorityBadge priority={w.priority} />
      </div>
      <div className="mt-1 text-sm text-ink-900">{w.productName}</div>
      <div className="text-xs text-ink-500">
        {w.customerRef} · {fmtNum(w.targetQty)} {w.unit}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <DeliveryBadge dueDate={w.dueDate} />
        <span className="text-[11px] text-ink-500">{fmtDate(w.dueDate)}</span>
      </div>
      {WO_TRANSITIONS[w.status].length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-ink-100 pt-2">
          {WO_TRANSITIONS[w.status].map((to) => (
            <button
              key={to}
              disabled={busy}
              onClick={() => move(w._id, to, w.status)}
              className="btn-ghost btn-sm !py-1"
              title={`Move to ${WO_STATUS_LABELS[to]}`}
            >
              <Icon name="chevronRight" size={13} />
              {WO_STATUS_LABELS[to]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
