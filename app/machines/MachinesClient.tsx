"use client";

import { getJSON, fmtDate } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { PageHeader } from "@/components/PageHeader";
import { STAGE_LABELS } from "@/lib/domain";

export default function MachinesClient({ initial }: { initial: any[] | null }) {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/machines?withQueue=1"),
    [],
    { cacheKey: "/api/machines?withQueue=1", initialData: initial ?? undefined }
  );

  const statusStyle: Record<string, string> = {
    Available: "pill pill-green",
    Running: "pill pill-blue",
    Down: "pill pill-red",
    Maintenance: "pill pill-amber",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Machines & Lines"
        subtitle="Capacity, status and queue per machine — “what’s queued on Loom 3”."
      />

      <DataGate loading={loading} error={error} onReload={reload}>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data || []).map((m) => (
            <div key={m._id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-ink-500">{m.code}</div>
                </div>
                <span className={statusStyle[m.status] || "pill pill-neutral"}>
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
