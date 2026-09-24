"use client";

import { getJSON, fmtDate } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { STAGE_LABELS } from "@/lib/domain";

export default function MachinesPage() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/machines?withQueue=1"),
    []
  );

  const statusStyle: Record<string, string> = {
    Available: "bg-emerald-100 text-emerald-700",
    Running: "bg-blue-100 text-blue-700",
    Down: "bg-red-100 text-red-700",
    Maintenance: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Machines &amp; Lines</h1>
        <p className="text-sm text-ink-500">
          Capacity, status and queue per machine — “what’s queued on Loom 3”.
        </p>
      </div>

      <DataGate loading={loading} error={error} onReload={reload}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data || []).map((m) => (
            <div key={m._id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-ink-500">{m.code}</div>
                </div>
                <span className={`badge ${statusStyle[m.status] || ""}`}>
                  {m.status}
                </span>
              </div>
              <div className="mt-3 text-sm text-ink-700 space-y-1">
                <div>
                  Stage:{" "}
                  <b>
                    {m.stage
                      ? STAGE_LABELS[m.stage as keyof typeof STAGE_LABELS]
                      : "—"}
                  </b>
                </div>
                <div>
                  Capacity: {m.capacityPerShift} {m.capacityUnit} / shift
                </div>
                <div>
                  Queue:{" "}
                  <b>{m.queue?.entries ?? 0}</b> entries
                  {m.queue?.lastDate
                    ? ` · last ${fmtDate(m.queue.lastDate)}`
                    : ""}
                </div>
              </div>
              {m.downtime?.length > 0 && (
                <div className="mt-2 text-xs text-amber-600">
                  {m.downtime.length} downtime record(s)
                </div>
              )}
            </div>
          ))}
          {(data || []).length === 0 && (
            <div className="text-sm text-ink-500">No machines yet.</div>
          )}
        </div>
      </DataGate>
    </div>
  );
}
