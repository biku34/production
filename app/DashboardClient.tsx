"use client";

import Link from "next/link";
import { getJSON, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Stat, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import { canCreateWorkOrder } from "@/lib/access";
import { Donut, BarList, StackBar, LegendRow, Pie, Scatter, type Slice } from "@/components/charts";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  STAGE_LABELS,
  type WoStatus,
} from "@/lib/domain";

/* --------------------------------- types ---------------------------------- */

export interface Dashboard {
  role: string;
  roleLabel: string;
  name: string;
  scopeBlurb: string;
  unrestricted: boolean;
  totals: {
    inScope: number; active: number; meters: number;
    overdue: number; today: number; tomorrow: number; onTrack: number; closed: number;
  };
  byStatus: Record<string, number>;
  byProduct: { name: string; count: number; meters: number }[];
  byCustomer: { name: string; count: number; meters: number }[];
  byPriority: { priority: string; count: number }[];
  dueBuckets: { bucket: string; count: number }[];
  qc?: { grades: { grade: string; count: number }[]; inspectedMeters: number; rejectRate: number; topDefects: { reason: string; qty: number }[] };
  packing?: { rolls: { grade: string; count: number; meters: number }[]; totalRolls: number; metersPacked: number; ready: number; dispatched: number };
  supervisor?: { machineLoad: { machine: string; entries: number; meters: number }[]; lossByStage: { stage: string; avgLossPct: number; flagged: number }[] };
  jobwork?: { total: number; out: number; returned: number; byVendor: { vendor: string; count: number }[] };
  store?: { byMaterial: { material: string; qty: number }[]; totalIssued: number; issueCount: number };
  manager?: { lossByStage: { stage: string; avgLossPct: number; flagged: number }[]; rollsByGrade: { grade: string; count: number; meters: number }[] };
  recent: { _id: string; woNo: string; status: string; customer: string; product: string; at: string }[];
}

const GRADE_COLORS: Record<string, string> = { A: "#1c6f63", B: "#f59e0b", C: "#f97316", Reject: "#dc2626" };
const DUE_COLORS: Record<string, string> = { Overdue: "#dc2626", Today: "#d97706", Tomorrow: "#2563eb", Later: "#64748b" };
const PALETTE = ["#1c6f63", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#d946ef"];

/* ------------------------------- component -------------------------------- */

export default function DashboardClient({ initial }: { initial: Dashboard | null }) {
  const { role } = useRole();
  const { data, error, loading, reload } = useAsync<Dashboard>(
    () => getJSON("/api/dashboard"),
    [],
    { cacheKey: "/api/dashboard", initialData: initial ?? undefined }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={data ? `${greeting()}, ${firstName(data.name)}` : "Dashboard"}
        subtitle={data ? `${data.roleLabel} · ${data.scopeBlurb}` : "Your production overview"}
        action={
          canCreateWorkOrder(role) ? (
            <Link href="/work-orders/new" className="btn-primary">
              <Icon name="plus" size={16} />
              New Work Order
            </Link>
          ) : undefined
        }
      />

      <DataGate loading={loading} error={error} onReload={reload}>
        {data && <Body data={data} />}
      </DataGate>
    </div>
  );
}

function Body({ data }: { data: Dashboard }) {
  const t = data.totals;
  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label={data.unrestricted ? "Work orders" : "In my queue"} value={t.inScope} hint={`${t.active} active`} />
        <Stat label="Overdue" value={t.overdue} tone={t.overdue ? "danger" : "default"} hint="not yet closed" />
        <Stat label="Due today" value={t.today} tone={t.today ? "warn" : "default"} />
        <Stat label="Due tomorrow" value={t.tomorrow} />
        <RoleTile data={data} />
      </div>

      {/* Spotlight + delivery outlook */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Spotlight data={data} />
        <DeliveryCard data={data} />
      </div>

      {/* Manager / admin: loss + grade mix + priority (varied chart types) */}
      {data.manager && <ManagerExtras m={data.manager} priority={data.byPriority} />}

      {/* Product (bars) + customer (ranked) — two different treatments */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Top products" hint={`${data.byProduct.length} products`}>
          {data.byProduct.length === 0 ? (
            <Empty />
          ) : (
            <BarList
              data={data.byProduct.map((p, i) => ({ label: p.name, value: p.count, color: PALETTE[i % PALETTE.length] }))}
            />
          )}
        </Card>
        <Card title="Top customers" hint="orders vs meters">
          {data.byCustomer.length === 0 ? (
            <Empty />
          ) : (
            <Scatter
              points={data.byCustomer.map((c, i) => ({ label: c.name, x: c.count, y: c.meters, color: PALETTE[i % PALETTE.length] }))}
              xLabel="Orders"
              yLabel="Meters"
            />
          )}
        </Card>
      </div>

      {/* Recent activity — compact 2-up */}
      <Card title="Recent activity" hint="latest updates in your scope">
        {data.recent.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {data.recent.map((r) => (
              <Link
                key={r._id}
                href={`/work-orders/${r._id}`}
                className="flex items-center gap-2 border-b border-ink-100 py-2 text-sm hover:bg-ink-50/60"
              >
                <span className="shrink-0 font-semibold text-brand-700">{r.woNo}</span>
                <StatusBadge status={r.status as WoStatus} />
                <span className="min-w-0 flex-1 truncate text-ink-500">
                  {r.product} · {r.customer}
                </span>
                <Icon name="chevronRight" size={14} className="shrink-0 text-ink-300" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Manager/admin extras: wastage-by-stage bars, grade-mix stacked bar, priority mix. */
function ManagerExtras({
  m,
  priority,
}: {
  m: NonNullable<Dashboard["manager"]>;
  priority: Dashboard["byPriority"];
}) {
  const grades: Slice[] = m.rollsByGrade.map((g) => ({
    label: `Grade ${g.grade}`,
    value: g.count,
    color: GRADE_COLORS[g.grade] || "#71717a",
  }));
  const gradeMeters = m.rollsByGrade.reduce((a, g) => a + g.meters, 0);
  const prioColor = (p: string) =>
    p === "Rush" ? "#dc2626" : p === "Flagged" ? "#f59e0b" : "#64748b";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Wastage & loss by stage" hint="avg %, flagged in red">
        {m.lossByStage.length === 0 ? (
          <Empty text="No stage entries yet." />
        ) : (
          <BarList
            data={m.lossByStage.map((l) => ({
              label: STAGE_LABELS[l.stage as keyof typeof STAGE_LABELS] || l.stage,
              value: l.avgLossPct,
              color: l.flagged ? "#dc2626" : "#1c6f63",
            }))}
            valueSuffix="%"
          />
        )}
      </Card>
      <Card title="Finished output by grade" hint={`${fmtNum(gradeMeters)} m`}>
        {grades.length === 0 ? (
          <Empty text="No rolls packed yet." />
        ) : (
          <div className="space-y-4">
            <StackBar data={grades} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {m.rollsByGrade.map((g) => (
                <LegendRow
                  key={g.grade}
                  color={GRADE_COLORS[g.grade] || "#71717a"}
                  label={`Grade ${g.grade}`}
                  value={`${g.count} · ${fmtNum(g.meters)}m`}
                />
              ))}
            </div>
            {priority.length > 0 && (
              <div className="border-t border-ink-100 pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Priority mix
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {priority.map((p) => (
                    <span key={p.priority} className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: prioColor(p.priority) }}
                      />
                      <span className="text-ink-600">{p.priority}</span>
                      <span className="font-semibold tabular-nums text-ink-900">{p.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ role-specific ----------------------------- */

function RoleTile({ data }: { data: Dashboard }) {
  if (data.qc) return <Stat label="Reject rate" value={`${data.qc.rejectRate}%`} tone={data.qc.rejectRate > 3 ? "warn" : "good"} hint="of inspected meters" />;
  if (data.packing) return <Stat label="Rolls packed" value={data.packing.totalRolls} tone="good" hint={`${fmtNum(data.packing.metersPacked)} m`} />;
  if (data.supervisor) return <Stat label="Machines active" value={data.supervisor.machineLoad.length} hint={`${data.supervisor.machineLoad.reduce((a, m) => a + m.entries, 0)} entries`} />;
  if (data.store) return <Stat label="Material issued" value={fmtNum(data.store.totalIssued)} hint={`${data.store.issueCount} issues`} />;
  return <Stat label="Closed" value={data.totals.closed} tone="good" hint={`${fmtNum(data.totals.meters)} m total`} />;
}

function Spotlight({ data }: { data: Dashboard }) {
  // QC — grade mix + defects
  if (data.qc) {
    const slices: Slice[] = data.qc.grades.map((g) => ({ label: `Grade ${g.grade}`, value: g.count, color: GRADE_COLORS[g.grade] || "#71717a" }));
    return (
      <Card title="Inspection quality" hint={`${data.qc.rejectRate}% reject`}>
        {slices.length === 0 ? <Empty text="Nothing inspected yet." /> : (
          <div className="space-y-4">
            <StackBar data={slices} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {slices.map((s) => <LegendRow key={s.label} color={s.color} label={s.label} value={s.value} />)}
            </div>
            {data.qc.topDefects.length > 0 && (
              <div>
                <div className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Top defects</div>
                <BarList data={data.qc.topDefects.map((d, i) => ({ label: prettyReason(d.reason), value: Math.round(d.qty), color: PALETTE[i % PALETTE.length] }))} valueSuffix="m" />
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Packing / Dispatch — rolls + ready vs dispatched
  if (data.packing) {
    const slices: Slice[] = data.packing.rolls.map((g) => ({ label: `Grade ${g.grade}`, value: g.count, color: GRADE_COLORS[g.grade] || "#71717a" }));
    return (
      <Card title="Packed output & dispatch" hint={`${data.packing.totalRolls} rolls`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Ready to dispatch" value={data.packing.ready} color="#06b6d4" />
            <MiniStat label="Dispatched / closed" value={data.packing.dispatched} color="#1c6f63" />
          </div>
          {slices.length === 0 ? <Empty text="No rolls packed yet." /> : (
            <>
              <StackBar data={slices} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {data.packing.rolls.map((g) => (
                  <LegendRow key={g.grade} color={GRADE_COLORS[g.grade] || "#71717a"} label={`Grade ${g.grade}`} value={`${g.count} · ${fmtNum(g.meters)}m`} />
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    );
  }

  // Supervisor / Job-work — machine load + loss
  if (data.supervisor) {
    return (
      <Card title="Machine load & loss" hint="your production stage">
        {data.supervisor.machineLoad.length === 0 ? <Empty text="No production entries yet." /> : (
          <div className="space-y-4">
            {(() => {
              const loadSlices: Slice[] = data.supervisor!.machineLoad.map((m, i) => ({ label: m.machine, value: m.entries, color: PALETTE[i % PALETTE.length] }));
              const lossSlices: Slice[] = data.supervisor!.lossByStage.map((l) => ({ label: STAGE_LABELS[l.stage as keyof typeof STAGE_LABELS] || l.stage, value: l.avgLossPct, color: l.flagged ? "#dc2626" : "#1c6f63" }));
              return (
                <div className="grid gap-5 sm:grid-cols-2">
                  <PieBlock title="Machine load" subtitle="entries per machine" slices={loadSlices} />
                  {lossSlices.length > 0 && (
                    <PieBlock title="Loss by stage" subtitle="avg %" slices={lossSlices} valueSuffix="%" />
                  )}
                </div>
              );
            })()}
            {data.jobwork && (
              <div className="grid grid-cols-3 gap-3">
                <MiniStat label="Job-work total" value={data.jobwork.total} color="#8b5cf6" />
                <MiniStat label="Out at vendor" value={data.jobwork.out} color="#f59e0b" />
                <MiniStat label="Returned" value={data.jobwork.returned} color="#1c6f63" />
              </div>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Store — materials issued
  if (data.store) {
    return (
      <Card title="Material issued" hint={`${data.store.issueCount} issue slips`}>
        {data.store.byMaterial.length === 0 ? <Empty text="No materials issued yet." /> : (
          <BarList data={data.store.byMaterial.map((m, i) => ({ label: m.material, value: m.qty, color: PALETTE[i % PALETTE.length] }))} valueSuffix=" kg" />
        )}
      </Card>
    );
  }

  // Manager / Admin — full pipeline donut
  const statusSlices: Slice[] = WO_STATUSES.map((s) => ({ label: WO_STATUS_LABELS[s as WoStatus], value: data.byStatus[s] || 0, color: WO_STATUS_COLORS[s as WoStatus] }));
  return (
    <Card title="Work orders by status" hint="whole pipeline">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <div className="shrink-0"><Donut data={statusSlices} centerValue={data.totals.inScope} centerLabel="orders" /></div>
        <div className="w-full flex-1 space-y-1.5">
          {statusSlices.map((s) => <LegendRow key={s.label} color={s.color} label={s.label} value={s.value} />)}
        </div>
      </div>
    </Card>
  );
}

function DeliveryCard({ data }: { data: Dashboard }) {
  const slices: Slice[] = data.dueBuckets.map((b) => ({
    label: bucketLabel(b.bucket),
    value: b.count,
    color: DUE_COLORS[b.bucket] || "#64748b",
  }));
  const active = slices.reduce((a, s) => a + s.value, 0);
  const legend = [...slices, { label: "Closed", value: data.totals.closed, color: "#1c6f63" }];
  const atRisk = data.totals.overdue + data.totals.today;
  const onTimePct = active ? Math.round(((active - data.totals.overdue) / active) * 100) : 100;

  return (
    <Card title="Delivery outlook" hint="active jobs by due date">
      {active === 0 && data.totals.closed === 0 ? (
        <Empty text="No active jobs." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-semibold leading-none tabular-nums text-ink-900">
                {onTimePct}%
              </div>
              <div className="mt-1 text-xs text-ink-500">on schedule</div>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-semibold leading-none tabular-nums ${
                  atRisk ? "text-red-600" : "text-ink-900"
                }`}
              >
                {atRisk}
              </div>
              <div className="mt-1 text-xs text-ink-500">overdue or due today</div>
            </div>
          </div>
          {/* Stacked bar — different chart type from the ranked bar lists */}
          <StackBar data={slices} />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {legend.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-ink-600">{s.label}</span>
                <span className="font-semibold tabular-nums text-ink-900">{s.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* -------------------------------- helpers --------------------------------- */

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** A pie chart with a heading and a legend list beside it. */
function PieBlock({
  title,
  subtitle,
  slices,
  valueSuffix = "",
}: {
  title: string;
  subtitle?: string;
  slices: Slice[];
  valueSuffix?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</div>
        {subtitle && <div className="text-[11px] text-ink-400">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <Pie data={slices} size={116} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {slices.map((s) => (
            <LegendRow key={s.label} color={s.color} label={s.label} value={`${s.value}${valueSuffix}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-ink-100 p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-xl font-semibold tabular-nums text-ink-900">{value}</div>
      <div className="text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function Empty({ text = "No data yet." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-ink-400">{text}</p>;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function firstName(name: string) {
  return name.split(" ")[0];
}
function bucketLabel(b: string) {
  switch (b) {
    case "Overdue": return "Overdue";
    case "Today": return "Due today";
    case "Tomorrow": return "Due tomorrow";
    default: return "Later / on track";
  }
}
function prettyReason(code: string) {
  return code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
