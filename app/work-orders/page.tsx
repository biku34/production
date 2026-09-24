"use client";

import { useState } from "react";
import Link from "next/link";
import { getJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { StatusBadge, DeliveryBadge, PriorityBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { WO_STATUSES, WO_STATUS_LABELS, type WoStatus } from "@/lib/domain";

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

  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON(`/api/work-orders?${params.toString()}`),
    [status, q]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Orders</h1>
          <p className="text-sm text-ink-500">
            List with filters — same grid conventions as the reference app.
          </p>
        </div>
        <Link href="/work-orders/new" className="btn-primary">
          <Icon name="plus" size={16} />
          New Work Order
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input !w-64"
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
        <div className="card overflow-hidden">
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
