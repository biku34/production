"use client";

import { useState } from "react";
import Link from "next/link";
import { getJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { StatusBadge, DeliveryBadge, PriorityBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  deliveryFlag,
  type WoStatus,
} from "@/lib/domain";

interface Wo {
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

export default function WorkOrdersPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const listUrl = `/api/work-orders?${params.toString()}`;
  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON(listUrl),
    [status, q],
    { cacheKey: listUrl }
  );

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
              {(w.priority !== "Normal" ||
                deliveryFlag(w.dueDate) !== "None") && (
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
              {(data || []).map((w) => (
                <tr key={w._id} className="hover:bg-ink-100/40">
                  <td className="td">
                    <Link
                      href={`/work-orders/${w._id}`}
                      className="font-semibold text-brand-700 hover:underline"
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
              ))}
              {(data || []).length === 0 && (
                <tr>
                  <td className="td text-center text-ink-500 py-8" colSpan={7}>
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
