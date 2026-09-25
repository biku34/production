"use client";

import { getJSON, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Stat } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { STAGE_LABELS } from "@/lib/domain";

export default function ReportsClient({
  initialWip,
  initialJobwork,
}: {
  initialWip: any;
  initialJobwork: any[] | null;
}) {
  const wip = useAsync<any>(() => getJSON("/api/reports/wip"), [], {
    cacheKey: "/api/reports/wip",
    initialData: initialWip ?? undefined,
  });
  const jobwork = useAsync<any[]>(() => getJSON("/api/jobwork"), [], {
    cacheKey: "/api/jobwork",
    initialData: initialJobwork ?? undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Dashboards"
        subtitle="Delivery performance, wastage variance, job-work register (SRS §9)."
      />

      <DataGate
        loading={wip.loading}
        error={wip.error}
        onReload={() => {
          wip.reload();
          jobwork.reload();
        }}
      >
        {wip.data && (
          <>
            <section className="space-y-3">
              <h2 className="font-semibold">Delivery performance</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat
                  label="Overdue"
                  value={wip.data.delivery.overdue}
                  tone={wip.data.delivery.overdue ? "danger" : "default"}
                />
                <Stat label="Due today" value={wip.data.delivery.today} tone="warn" />
                <Stat label="Due tomorrow" value={wip.data.delivery.tomorrow} />
                <Stat label="Closed" value={wip.data.delivery.closed} tone="good" />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">
                Wastage &amp; loss variance (vs standard)
              </h2>
              {wip.data.lossByStage.length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-500">
                  No stage entries yet.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-2 md:hidden">
                    {wip.data.lossByStage.map((l: any) => (
                      <div key={l._id} className="card p-3">
                        <div className="mb-1.5 text-sm font-medium text-ink-900">
                          {STAGE_LABELS[l._id as keyof typeof STAGE_LABELS] ||
                            l._id}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
                          <Kv k="Total loss" v={fmtNum(l.totalLossQty, 1)} />
                          <Kv k="Avg loss %" v={`${l.avgLossPct?.toFixed(1)}%`} />
                          <Kv
                            k="Flagged"
                            v={l.flagged}
                            danger={!!l.flagged}
                          />
                          <Kv k="Entries" v={l.entries} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="card hidden overflow-hidden md:block">
                    <table className="w-full">
                      <thead className="bg-ink-100/50">
                        <tr>
                          <th className="th">Stage</th>
                          <th className="th text-right">Total loss qty</th>
                          <th className="th text-right">Avg loss %</th>
                          <th className="th text-right">Flagged entries</th>
                          <th className="th text-right">Total entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wip.data.lossByStage.map((l: any) => (
                          <tr key={l._id}>
                            <td className="td">
                              {STAGE_LABELS[l._id as keyof typeof STAGE_LABELS] ||
                                l._id}
                            </td>
                            <td className="td text-right">
                              {fmtNum(l.totalLossQty, 1)}
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
                  </div>
                </>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Rolls by grade</h2>
              <div className="flex flex-wrap gap-2">
                {wip.data.rollsByGrade.map((g: any) => (
                  <span key={g._id} className="badge bg-ink-100 text-ink-700">
                    Grade {g._id}: {g.count} rolls · {fmtNum(g.meters, 0)} m
                  </span>
                ))}
                {wip.data.rollsByGrade.length === 0 && (
                  <span className="text-sm text-ink-500">No rolls packed.</span>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Job-work register</h2>
              {(jobwork.data || []).length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-500">
                  No job-work dispatches.
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-2 md:hidden">
                    {(jobwork.data || []).map((j: any) => (
                      <div key={j._id} className="card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {j.woNo} · {j.vendorName}
                          </span>
                          <span className="badge bg-ink-100 text-ink-700">
                            {j.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-ink-500">
                          {STAGE_LABELS[j.stage as keyof typeof STAGE_LABELS]}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
                          <Kv k="Sent" v={fmtNum(j.qtySent, 0)} />
                          <Kv k="Returned" v={fmtNum(j.qtyReturned, 0)} />
                          <Kv
                            k="Shortage"
                            v={fmtNum(j.shortageQty, 0)}
                            danger={!!j.shortageQty}
                          />
                          <Kv k="Cost" v={`₹${fmtNum(j.actualCost, 0)}`} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="card hidden overflow-hidden md:block">
                    <table className="w-full">
                      <thead className="bg-ink-100/50">
                        <tr>
                          <th className="th">WO</th>
                          <th className="th">Vendor</th>
                          <th className="th">Stage</th>
                          <th className="th text-right">Sent</th>
                          <th className="th text-right">Returned</th>
                          <th className="th text-right">Shortage</th>
                          <th className="th text-right">Cost</th>
                          <th className="th">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(jobwork.data || []).map((j: any) => (
                          <tr key={j._id}>
                            <td className="td font-medium">{j.woNo}</td>
                            <td className="td">{j.vendorName}</td>
                            <td className="td text-xs">
                              {STAGE_LABELS[j.stage as keyof typeof STAGE_LABELS]}
                            </td>
                            <td className="td text-right">
                              {fmtNum(j.qtySent, 0)}
                            </td>
                            <td className="td text-right">
                              {fmtNum(j.qtyReturned, 0)}
                            </td>
                            <td className="td text-right text-red-600">
                              {fmtNum(j.shortageQty, 0)}
                            </td>
                            <td className="td text-right">
                              ₹{fmtNum(j.actualCost, 0)}
                            </td>
                            <td className="td text-xs">{j.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </DataGate>
    </div>
  );
}

function Kv({
  k,
  v,
  danger,
}: {
  k: string;
  v: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-500">{k}</span>
      <span className={danger ? "font-semibold text-red-600" : "text-ink-900"}>
        {v}
      </span>
    </div>
  );
}
