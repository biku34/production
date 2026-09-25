"use client";

import Link from "next/link";
import { getJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Stat } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Donut, BarList, StackBar, LegendRow, type Slice } from "@/components/charts";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";

export interface Wip {
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

const GRADE_COLORS: Record<string, string> = {
  A: "#1c6f63",
  B: "#f59e0b",
  C: "#f97316",
  Reject: "#dc2626",
};

export default function DashboardClient({ initial }: { initial: Wip | null }) {
  const { data, error, loading, reload } = useAsync<Wip>(
    () => getJSON("/api/reports/wip"),
    [],
    { cacheKey: "/api/reports/wip", initialData: initial ?? undefined }
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
        {data && <DashboardBody data={data} />}
      </DataGate>
    </div>
  );
}

function DashboardBody({ data }: { data: Wip }) {
  const statusSlices: Slice[] = WO_STATUSES.map((s) => ({
    label: WO_STATUS_LABELS[s as WoStatus],
    value: data.byStatus[s] || 0,
    color: WO_STATUS_COLORS[s as WoStatus],
  }));

  const activeWo = data.totalWo - (data.byStatus["Closed"] || 0);

  const lossSlices: Slice[] = data.lossByStage.map((l) => ({
    label: STAGE_LABELS[l._id as keyof typeof STAGE_LABELS] || l._id,
    value: Number((l.avgLossPct || 0).toFixed(1)),
    color: l.flagged ? "#dc2626" : "#1c6f63",
  }));

  const gradeSlices: Slice[] = data.rollsByGrade.map((g) => ({
    label: `Grade ${g._id}`,
    value: g.count,
    color: GRADE_COLORS[g._id] || "#71717a",
  }));
  const totalMeters = data.rollsByGrade.reduce((a, g) => a + g.meters, 0);
  const totalRolls = data.rollsByGrade.reduce((a, g) => a + g.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total work orders" value={data.totalWo} hint={`${activeWo} active`} />
        <Stat
          label="Overdue"
          value={data.delivery.overdue}
          tone={data.delivery.overdue ? "danger" : "default"}
          hint="not yet closed"
        />
        <Stat
          label="Due today"
          value={data.delivery.today}
          tone={data.delivery.today ? "warn" : "default"}
        />
        <Stat label="Due tomorrow" value={data.delivery.tomorrow} />
        <Stat label="Closed" value={data.delivery.closed} tone="good" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Work orders by status</h2>
            <Link
              href="/job-board"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Job Board
              <Icon name="chevronRight" size={14} />
            </Link>
          </div>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
            <div className="shrink-0">
              <Donut
                data={statusSlices}
                centerValue={data.totalWo}
                centerLabel="orders"
              />
            </div>
            <div className="w-full flex-1 space-y-1.5">
              {statusSlices.map((s) => (
                <LegendRow key={s.label} color={s.color} label={s.label} value={s.value} />
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Wastage &amp; loss by stage</h2>
            <span className="text-xs text-ink-400">avg %, flagged in red</span>
          </div>
          {lossSlices.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">
              No stage entries yet.
            </p>
          ) : (
            <BarList data={lossSlices} valueSuffix="%" />
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Finished output by grade</h2>
          <span className="text-sm text-ink-500 tabular-nums">
            {totalRolls} rolls · {totalMeters.toLocaleString("en-IN")} m
          </span>
        </div>
        {gradeSlices.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            No rolls packed yet.
          </p>
        ) : (
          <div className="space-y-4">
            <StackBar data={gradeSlices} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {data.rollsByGrade.map((g) => (
                <LegendRow
                  key={g._id}
                  color={GRADE_COLORS[g._id] || "#71717a"}
                  label={`Grade ${g._id}`}
                  value={`${g.count} · ${g.meters.toFixed(0)}m`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
