"use client";

import Link from "next/link";
import { getJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Stat } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";

interface Wip {
  totalWo: number;
  byStatus: Record<string, number>;
  delivery: { overdue: number; today: number; tomorrow: number; closed: number };
  lossByStage: {
    _id: string;
    totalLossQty: number;
    avgLossPct: number;
    flagged: number;
    entries: number;
  }[];
  rollsByGrade: { _id: string; count: number; meters: number }[];
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useAsync<Wip>(
    () => getJSON("/api/reports/wip"),
    [],
    { cacheKey: "/api/reports/wip" }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Dashboard"
        subtitle="What needs to be made, where it is, and whether it’s on schedule."
        action={
          <Link href="/work-orders/new" className="btn-primary">
            <Icon name="plus" size={16} />
            New Work Order
          </Link>
        }
      />

      <DataGate loading={loading} error={error} onReload={reload}>
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Total Work Orders" value={data.totalWo} />
              <Stat
                label="Overdue"
                value={data.delivery.overdue}
                tone={data.delivery.overdue ? "danger" : "default"}
                hint="not yet closed"
              />
              <Stat
                label="Delivery Today"
                value={data.delivery.today}
                tone={data.delivery.today ? "warn" : "default"}
              />
              <Stat label="Delivery Tomorrow" value={data.delivery.tomorrow} />
              <Stat
                label="Closed"
                value={data.delivery.closed}
                tone="good"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-5">
                <h2 className="font-semibold mb-3">
                  Job Board summary{" "}
                  <span className="text-xs font-normal text-ink-500">
                    [Order-wise]
                  </span>
                </h2>
                <div className="space-y-2">
                  {WO_STATUSES.map((s) => {
                    const n = data.byStatus[s] || 0;
                    const pct = data.totalWo
                      ? (n / data.totalWo) * 100
                      : 0;
                    return (
                      <div key={s} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-28 shrink-0 text-xs text-ink-700 sm:w-40 sm:text-sm">
                          {WO_STATUS_LABELS[s as WoStatus]}
                        </div>
                        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-ink-100">
                          <div
                            className="h-full bg-brand-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-6 text-right text-sm font-medium tabular-nums sm:w-8">
                          {n}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link
                  href="/job-board"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Open Job Board
                  <Icon name="chevronRight" size={14} />
                </Link>
              </div>

              <div className="card p-5">
                <h2 className="font-semibold mb-3">
                  Wastage &amp; loss by stage
                </h2>
                {data.lossByStage.length === 0 ? (
                  <p className="text-sm text-ink-500">No stage entries yet.</p>
                ) : (
                  <>
                    {/* Mobile: compact rows */}
                    <div className="divide-y divide-ink-100 sm:hidden">
                      {data.lossByStage.map((l) => (
                        <div
                          key={l._id}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <span className="text-sm text-ink-800">
                            {STAGE_LABELS[l._id as keyof typeof STAGE_LABELS] ||
                              l._id}
                          </span>
                          <div className="flex items-center gap-3 text-xs tabular-nums">
                            <span className="text-ink-600">
                              {l.avgLossPct?.toFixed(1)}%
                            </span>
                            <span
                              className={
                                l.flagged
                                  ? "font-semibold text-red-600"
                                  : "text-ink-400"
                              }
                            >
                              {l.flagged} flagged
                            </span>
                            <span className="text-ink-400">
                              {l.entries} ent.
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: table */}
                    <table className="hidden w-full sm:table">
                      <thead>
                        <tr>
                          <th className="th">Stage</th>
                          <th className="th text-right">Avg loss %</th>
                          <th className="th text-right">Flagged</th>
                          <th className="th text-right">Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lossByStage.map((l) => (
                          <tr key={l._id}>
                            <td className="td">
                              {STAGE_LABELS[l._id as keyof typeof STAGE_LABELS] ||
                                l._id}
                            </td>
                            <td className="td text-right">
                              {l.avgLossPct?.toFixed(1)}%
                            </td>
                            <td
                              className={`td text-right ${
                                l.flagged ? "text-red-600 font-semibold" : ""
                              }`}
                            >
                              {l.flagged}
                            </td>
                            <td className="td text-right">{l.entries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.rollsByGrade.map((g) => (
                    <span
                      key={g._id}
                      className="badge bg-ink-100 text-ink-700"
                    >
                      Grade {g._id}: {g.count} rolls · {g.meters.toFixed(0)} m
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </DataGate>
    </div>
  );
}
