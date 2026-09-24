"use client";

import { getJSON, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Stat } from "@/components/ui";
import { STAGE_LABELS } from "@/lib/domain";

export default function ReportsPage() {
  const wip = useAsync<any>(() => getJSON("/api/reports/wip"), []);
  const jobwork = useAsync<any[]>(() => getJSON("/api/jobwork"), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports &amp; Dashboards</h1>
        <p className="text-sm text-ink-500">
          Delivery performance, wastage variance, job-work register (SRS §9).
        </p>
      </div>

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
              <div className="card overflow-hidden">
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
                    {wip.data.lossByStage.length === 0 && (
                      <tr>
                        <td className="td text-ink-500 text-center py-6" colSpan={5}>
                          No stage entries yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <div className="card overflow-hidden">
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
                        <td className="td text-right">{fmtNum(j.qtySent, 0)}</td>
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
                    {(jobwork.data || []).length === 0 && (
                      <tr>
                        <td className="td text-ink-500 text-center py-6" colSpan={8}>
                          No job-work dispatches.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </DataGate>
    </div>
  );
}
