"use client";

import { useState } from "react";
import Link from "next/link";
import { getJSON, postJSON, fmtDate } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { DeliveryBadge, PriorityBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_TRANSITIONS,
  STAGE_TO_STATUS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";

interface Wo {
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

export default function JobBoardPage() {
  const { role, stage } = useRole();
  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON("/api/work-orders"),
    [],
    { cacheKey: "/api/work-orders" }
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Role-scoping (FR-JB-3): a stage supervisor sees only their stage's column.
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
      await postJSON(`/api/work-orders/${woId}/transition`, {
        to,
        byName: role,
      });
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
            : "Kanban across the fabric production lifecycle. Drag a card to advance it."
        }
        action={
          <Link href="/work-orders/new" className="btn-primary">
            <Icon name="plus" size={16} />
            New Work Order
          </Link>
        }
      />

      {toast && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {toast}
        </div>
      )}

      <DataGate loading={loading} error={error} onReload={reload}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleStatuses.map((status) => {
            const cards = grouped(status);
            return (
              <div
                key={status}
                className={`w-72 shrink-0 rounded-xl bg-ink-100/60 border border-ink-300/50 ${
                  dragId ? "ring-1 ring-brand-100" : ""
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId) return;
                  const card = data?.find((w) => w._id === dragId);
                  if (card) move(dragId, status, card.status);
                }}
              >
                <div className="px-3 py-2 flex items-center justify-between border-b border-ink-300/50">
                  <span className="text-sm font-semibold">
                    {WO_STATUS_LABELS[status]}
                  </span>
                  <span className="badge bg-white text-ink-500">
                    {cards.length}
                  </span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {cards.map((w) => (
                    <div
                      key={w._id}
                      draggable={!busy}
                      onDragStart={() => setDragId(w._id)}
                      onDragEnd={() => setDragId(null)}
                      className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/work-orders/${w._id}`}
                          className="font-semibold text-sm text-brand-700 hover:underline"
                        >
                          {w.woNo}
                        </Link>
                        <PriorityBadge priority={w.priority} />
                      </div>
                      <div className="text-sm mt-1">{w.productName}</div>
                      <div className="text-xs text-ink-500">
                        {w.customerRef} · {w.targetQty.toLocaleString()} {w.unit}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <DeliveryBadge dueDate={w.dueDate} />
                        <span className="text-[11px] text-ink-500">
                          {fmtDate(w.dueDate)}
                        </span>
                      </div>
                      {/* Action-driven transitions (FR-JB-4) as a fallback to drag */}
                      {WO_TRANSITIONS[w.status].length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
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
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center text-xs text-ink-400 py-6">
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
