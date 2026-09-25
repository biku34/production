"use client";

import { useState } from "react";
import Link from "next/link";
import { getJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { StatusBadge, DeliveryBadge, PriorityBadge, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  STAGE_LABELS,
  deliveryFlag,
  type WoStatus,
} from "@/lib/domain";

export interface Wo {
  _id: string;
  woNo: string;
  productName: string;
  sku: string;
  customerRef: string;
  targetQty: number;
  unit: string;
  status: WoStatus;
  priority: string;
  dueDate?: string;
}

export default function WorkOrdersClient({ initial }: { initial: Wo[] | null }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const listUrl = `/api/work-orders?${params.toString()}`;
  const isDefault = !status && !q;
  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON(listUrl),
    [status, q],
    {
      cacheKey: listUrl,
      initialData: isDefault ? initial ?? undefined : undefined,
    }
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Work Orders"
        subtitle="List with filters — same grid conventions as the reference app."
        action={
          <Link href="/work-orders/new" className="btn-primary">
            <Icon name="plus" size={16} />
            New Work Order
          </Link>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          className="input sm:!w-64"
          placeholder="Search WO no, product, customer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input !w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {WO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WO_STATUS_LABELS[s as WoStatus]}
            </option>
          ))}
        </select>
      </div>

      <DataGate loading={loading} error={error} onReload={reload}>
        {/* Mobile: stacked cards */}
        <div className="space-y-2 md:hidden">
          {(data || []).map((w) => (
            <Link
              key={w._id}
              href={`/work-orders/${w._id}`}
              className="card block p-3 active:bg-ink-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-brand-700">{w.woNo}</span>
                <StatusBadge status={w.status} />
              </div>
              <div className="mt-1 text-sm text-ink-900">{w.productName}</div>
              <div className="text-xs text-ink-500">
                {w.sku} · {w.customerRef}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium tabular-nums">
                  {fmtNum(w.targetQty)} {w.unit}
                </span>
                <span className="text-xs text-ink-500">{fmtDate(w.dueDate)}</span>
              </div>
              {(w.priority !== "Normal" || deliveryFlag(w.dueDate) !== "None") && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <PriorityBadge priority={w.priority} />
                  <DeliveryBadge dueDate={w.dueDate} />
                </div>
              )}
            </Link>
          ))}
          {(data || []).length === 0 && (
            <div className="card p-8 text-center text-sm text-ink-500">
              No work orders match.
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="card hidden overflow-hidden md:block">
          <table className="w-full">
            <thead className="bg-ink-100/50">
              <tr>
                <th className="th w-10"></th>
                <th className="th">WO No.</th>
                <th className="th">Product</th>
                <th className="th">Customer</th>
                <th className="th text-right">Target</th>
                <th className="th">Status</th>
                <th className="th">Due</th>
                <th className="th">Flags</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((w) => {
                const isOpen = expanded.has(w._id);
                return (
                  <FragmentRow
                    key={w._id}
                    w={w}
                    isOpen={isOpen}
                    onToggle={() => toggle(w._id)}
                  />
                );
              })}
              {(data || []).length === 0 && (
                <tr>
                  <td className="td text-center text-ink-500 py-8" colSpan={8}>
                    No work orders match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DataGate>
    </div>
  );
}

/** One collapsed work-order row plus its expandable detail panel. */
function FragmentRow({
  w,
  isOpen,
  onToggle,
}: {
  w: Wo;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-ink-100/40 ${
          isOpen ? "bg-ink-100/40" : ""
        }`}
        onClick={onToggle}
      >
        <td className="td text-center">
          <button
            type="button"
            className="btn-ghost btn-sm !p-1"
            aria-label={isOpen ? "Collapse" : "Expand"}
            aria-expanded={isOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Icon
              name="chevronRight"
              size={16}
              className={`text-ink-500 transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </button>
        </td>
        <td className="td">
          <Link
            href={`/work-orders/${w._id}`}
            className="font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {w.woNo}
          </Link>
        </td>
        <td className="td">
          <div>{w.productName}</div>
          <div className="text-xs text-ink-500">{w.sku}</div>
        </td>
        <td className="td">{w.customerRef}</td>
        <td className="td text-right">
          {fmtNum(w.targetQty)} {w.unit}
        </td>
        <td className="td">
          <StatusBadge status={w.status} />
        </td>
        <td className="td">{fmtDate(w.dueDate)}</td>
        <td className="td">
          <div className="flex gap-1">
            <PriorityBadge priority={w.priority} />
            <DeliveryBadge dueDate={w.dueDate} />
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-ink-50/60">
          <td></td>
          <td className="px-3 pb-4 pt-0" colSpan={7}>
            <WoDetailPreview id={w._id} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Lazy-loaded inline preview of a work order's specs, routing and stage lines. */
function WoDetailPreview({ id }: { id: string }) {
  const url = `/api/work-orders/${id}`;
  const { data, error, loading, reload } = useAsync<any>(
    () => getJSON(url),
    [id],
    { cacheKey: url }
  );

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <DataGate loading={loading} error={error} onReload={reload}>
        {data?.workOrder && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                  Specs snapshot
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Spec k="GSM" v={data.workOrder.specs?.gsm} />
                  <Spec
                    k="Width"
                    v={
                      data.workOrder.specs?.widthInch &&
                      `${data.workOrder.specs.widthInch}"`
                    }
                  />
                  <Spec k="Composition" v={data.workOrder.specs?.composition} />
                  <Spec k="Colour" v={data.workOrder.specs?.color} />
                  <Spec k="Finish" v={data.workOrder.specs?.finish} />
                  <Spec k="BOM ver" v={data.workOrder.bomVersion} />
                </dl>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                  Process routing
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(data.workOrder.routing || []).map((r: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span
                        className={`badge ${
                          r.mode === "JobWork"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS]}
                      </span>
                      {i < data.workOrder.routing.length - 1 && (
                        <Icon
                          name="chevronRight"
                          size={13}
                          className="text-ink-300"
                        />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                Stage entries — qty in / out & loss
              </div>
              {(!data.stageEntries || data.stageEntries.length === 0) ? (
                <EmptyState text="No stage entries yet." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Stage</th>
                      <th className="th text-right">In</th>
                      <th className="th text-right">Out</th>
                      <th className="th text-right">Loss</th>
                      <th className="th">Machine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stageEntries.map((s: any) => (
                      <tr key={s._id}>
                        <td className="td">
                          {STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS]}
                        </td>
                        <td className="td text-right">
                          {fmtNum(s.qtyIn, 0)} {s.inUnit}
                        </td>
                        <td className="td text-right">
                          {fmtNum(s.qtyOut, 0)} {s.outUnit}
                        </td>
                        <td
                          className={`td text-right ${
                            s.lossFlagged ? "font-semibold text-red-600" : ""
                          }`}
                        >
                          {s.lossPct?.toFixed(1)}%
                        </td>
                        <td className="td text-xs">{s.machineName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-1">
              <Link
                href={`/work-orders/${id}`}
                className="btn-ghost btn-sm"
              >
                Open full work order
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </div>
        )}
      </DataGate>
    </div>
  );
}

function Spec({ k, v }: { k: string; v?: any }) {
  return (
    <>
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-ink-900">{v ?? "—"}</dd>
    </>
  );
}
