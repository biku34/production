"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getJSON, postJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { StatusBadge, DeliveryBadge, PriorityBadge } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { Icon, type IconName } from "@/components/Icon";
import { useRole } from "@/components/RoleContext";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  WO_TRANSITIONS,
  STAGE_TO_STATUS,
  STAGE_LABELS,
  canRoleTransition,
  type Role,
  type WoStatus,
} from "@/lib/domain";
import { canCreateWorkOrder } from "@/lib/access";
import { JobBoardTabs } from "./JobBoardTabs";
import {
  type JobWo,
  DUE_BUCKETS,
  DUE_BUCKET_LABELS,
  DUE_BUCKET_TONE,
  dueBucket,
  daysLeftLabel,
} from "./board-utils";

type View = "list" | "grid" | "summary";

const VIEWS: { key: View; label: string; icon: IconName }[] = [
  { key: "list", label: "List", icon: "workorders" },
  { key: "grid", label: "Grid", icon: "dashboard" },
  { key: "summary", label: "Summary", icon: "reports" },
];

/** Toggleable columns for the List view (order = render order). */
type ColKey =
  | "customer" | "wo" | "title" | "assigned" | "days"
  | "due" | "status" | "priority" | "pipeline" | "view";
const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "customer", label: "Customer" },
  { key: "wo", label: "WO#" },
  { key: "title", label: "Title" },
  { key: "assigned", label: "Assigned To" },
  { key: "days", label: "Days Left" },
  { key: "due", label: "Due Date" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "pipeline", label: "Pipeline" },
  { key: "view", label: "View" },
];
const DEFAULT_COLS: ColKey[] = [
  "customer", "wo", "title", "assigned", "days", "due", "pipeline", "view",
];
const COLS_STORAGE_KEY = "jobboard.cols.v1";

export type { JobWo as Wo };

export default function JobBoardClient({ initial }: { initial: JobWo[] | null }) {
  const { role, stage } = useRole();
  const { data, error, loading, reload } = useAsync<JobWo[]>(
    () => getJSON("/api/work-orders"),
    [],
    { cacheKey: "/api/work-orders", initialData: initial ?? undefined }
  );

  const [view, setView] = useState<View>("list");
  const [statusFilter, setStatusFilter] = useState<WoStatus | "all">("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Which List-view columns are visible (persisted per browser).
  const [cols, setCols] = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ColKey[];
        if (Array.isArray(saved) && saved.length) setCols(new Set(saved));
      }
    } catch {
      /* ignore unavailable storage */
    }
  }, []);
  const toggleCol = (key: ColKey) =>
    setCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      // Keep at least one column visible.
      if (next.size === 0) return prev;
      try {
        localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });

  const scopedStatus =
    role === "StageSupervisor" && stage ? STAGE_TO_STATUS[stage] : null;

  const all = useMemo(() => {
    let rows = data || [];
    if (scopedStatus) rows = rows.filter((w) => w.status === scopedStatus);
    return rows;
  }, [data, scopedStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const s of WO_STATUSES) c[s] = 0;
    for (const w of all) c[w.status] = (c[w.status] || 0) + 1;
    return c;
  }, [all]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (!needle) return true;
      return `${w.woNo} ${w.productName} ${w.sku ?? ""} ${w.customerRef}`
        .toLowerCase()
        .includes(needle);
    });
  }, [all, statusFilter, q]);

  async function move(woId: string, to: WoStatus, from: WoStatus) {
    if (to === from) return;
    setBusy(true);
    setToast(null);
    try {
      await postJSON(`/api/work-orders/${woId}/transition`, { to });
      await reload();
    } catch (e: any) {
      setToast(e?.message || "Transition failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Production Job Board"
        subtitle="One row per in-flight work order. Track every job across the fabric production lifecycle."
        action={
          canCreateWorkOrder(role) ? (
            <Link href="/work-orders/new" className="btn-primary">
              <Icon name="plus" size={16} />
              New Work Order
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <JobBoardTabs />
        <button className="btn-ghost btn-sm" onClick={reload} disabled={busy || loading}>
          <Icon name="refresh" size={15} />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {toast}
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-3 py-2.5">
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  view === v.key
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <Icon name={v.icon} size={15} />
                {v.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[12rem] flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400">
              <Icon name="trace" size={15} />
            </span>
            <input
              className="input !w-full !pl-8"
              placeholder="Search WO#, product, customer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {view === "list" ? (
            <ColumnsMenu cols={cols} toggle={toggleCol} />
          ) : (
            <span className="ml-auto text-xs text-ink-400">
              Live auto-refresh — demo: off
            </span>
          )}
        </div>

        {/* Status tab strip */}
        <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-3 py-2">
          <StatusTab
            active={statusFilter === "all"}
            label="All"
            count={counts.all}
            color="#334155"
            onClick={() => setStatusFilter("all")}
          />
          {WO_STATUSES.map((s) => (
            <StatusTab
              key={s}
              active={statusFilter === s}
              label={WO_STATUS_LABELS[s]}
              count={counts[s] || 0}
              color={WO_STATUS_COLORS[s]}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>

        <DataGate loading={loading} error={error} onReload={reload}>
          {view === "list" && <ListView rows={rows} cols={cols} />}
          {view === "grid" && <GridView rows={rows} />}
          {view === "summary" && <SummaryView rows={rows} total={all.length} />}
        </DataGate>
      </div>
    </div>
  );
}

function StatusTab({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium ${
        active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
      }`}
    >
      {!active && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`rounded px-1.5 text-xs tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-ink-100 text-ink-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ------------------------------- List view -------------------------------- */

function boardInitials(name: string) {
  const parts = name.trim().split(/[\s.]+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
}

/** Dropdown to show/hide List-view columns (persisted in JobBoardClient). */
function ColumnsMenu({
  cols,
  toggle,
}: {
  cols: Set<ColKey>;
  toggle: (k: ColKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        className="btn-ghost btn-sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Icon name="reports" size={15} />
        Columns
        <span className="text-ink-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-ink-200 bg-white p-1.5 shadow-pop">
          <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Show columns
          </div>
          {COLUMNS.map((c) => {
            const checked = cols.has(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50"
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                    checked
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-300"
                  }`}
                >
                  {checked && <Icon name="check" size={11} />}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Read-only, column-configurable view. The Job Board only *shows* where each
 * work order is (the pipeline stage) and who is handling it — advancing a WO
 * happens on the work-order detail page.
 */
function ListView({ rows, cols }: { rows: JobWo[]; cols: Set<ColKey> }) {
  if (rows.length === 0)
    return (
      <div className="py-14 text-center text-sm text-ink-400">
        No jobs match your filters.
      </div>
    );

  const show = (k: ColKey) => cols.has(k);
  const visible = COLUMNS.filter((c) => cols.has(c.key));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
        <thead className="bg-ink-100/50">
          <tr>
            {visible.map((c) => (
              <th
                key={c.key}
                className={`th ${c.key === "view" || c.key === "days" ? "text-center" : ""} ${
                  c.key === "view" ? "w-14" : ""
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => {
            const dl = daysLeftLabel(w);
            const stageLabel = w.currentStage
              ? STAGE_LABELS[w.currentStage as keyof typeof STAGE_LABELS]
              : WO_STATUS_LABELS[w.status];
            return (
              <tr key={w._id} className="hover:bg-ink-100/40">
                {show("customer") && (
                  <td className="td font-medium text-ink-900">{w.customerRef}</td>
                )}
                {show("wo") && (
                  <td className="td">
                    <Link
                      href={`/work-orders/${w._id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {w.woNo}
                    </Link>
                  </td>
                )}
                {show("title") && (
                  <td className="td">
                    <div className="text-ink-900">{w.productName}</div>
                    <div className="text-xs text-ink-500">
                      {w.sku ? `${w.sku} · ` : ""}qty {fmtNum(w.targetQty)} {w.unit}
                    </div>
                  </td>
                )}
                {show("assigned") && (
                  <td className="td">
                    {w.assignedTo ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-600">
                          {boardInitials(w.assignedTo)}
                        </span>
                        <span className="whitespace-nowrap text-ink-800">
                          {w.assignedTo}
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-400">Unassigned</span>
                    )}
                  </td>
                )}
                {show("days") && (
                  <td className={`td whitespace-nowrap text-center font-medium ${dl.tone}`}>
                    {dl.label}
                  </td>
                )}
                {show("due") && (
                  <td className="td whitespace-nowrap">{fmtDate(w.dueDate)}</td>
                )}
                {show("status") && (
                  <td className="td">
                    <StatusBadge status={w.status} />
                  </td>
                )}
                {show("priority") && (
                  <td className="td">
                    <PriorityBadge priority={w.priority} />
                  </td>
                )}
                {show("pipeline") && (
                  <td className="td">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: WO_STATUS_COLORS[w.status] }}
                      />
                      <span className="whitespace-nowrap font-medium text-ink-800">
                        {stageLabel}
                      </span>
                    </span>
                  </td>
                )}
                {show("view") && (
                  <td className="td text-center">
                    <Link
                      href={`/work-orders/${w._id}`}
                      className="inline-grid h-8 w-8 place-items-center rounded-md border border-ink-200 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      title="View work order"
                      aria-label="View work order"
                    >
                      <Icon name="eye" size={16} />
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- Grid view -------------------------------- */
/* Rows = due buckets, columns = statuses, cells = counts. */

function GridView({ rows }: { rows: JobWo[] }) {
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const b of DUE_BUCKETS) {
      m[b] = { total: 0 };
      for (const s of WO_STATUSES) m[b][s] = 0;
    }
    for (const w of rows) {
      const b = dueBucket(w);
      m[b][w.status] += 1;
      m[b].total += 1;
    }
    return m;
  }, [rows]);

  const colTotals = useMemo(() => {
    const t: Record<string, number> = { total: 0 };
    for (const s of WO_STATUSES) t[s] = 0;
    for (const b of DUE_BUCKETS) {
      for (const s of WO_STATUSES) t[s] += matrix[b][s];
      t.total += matrix[b].total;
    }
    return t;
  }, [matrix]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px]">
        <thead className="bg-ink-100/50">
          <tr>
            <th className="th">Production due on</th>
            {WO_STATUSES.map((s) => (
              <th key={s} className="th text-center">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: WO_STATUS_COLORS[s] }}
                  />
                  {WO_STATUS_LABELS[s]}
                  <span className="text-ink-400">{colTotals[s]}</span>
                </span>
              </th>
            ))}
            <th className="th text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {DUE_BUCKETS.map((b) => {
            const tone = DUE_BUCKET_TONE[b];
            return (
              <tr key={b} className={tone.row}>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={b === "Closed" ? "check" : "warning"}
                      size={15}
                      className={tone.text}
                    />
                    <span className={`font-semibold ${tone.text}`}>
                      {DUE_BUCKET_LABELS[b]}
                    </span>
                  </div>
                </td>
                {WO_STATUSES.map((s) => (
                  <td
                    key={s}
                    className={`td text-center text-base tabular-nums ${
                      matrix[b][s]
                        ? "font-semibold text-brand-700"
                        : "text-ink-300"
                    }`}
                  >
                    {matrix[b][s]}
                  </td>
                ))}
                <td className="td text-center text-base font-semibold tabular-nums text-ink-900">
                  {matrix[b].total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ Summary view ------------------------------ */
/* Rows = statuses, columns = due buckets, cells = WO# chips. */

function SummaryView({ rows, total }: { rows: JobWo[]; total: number }) {
  const cols = [...DUE_BUCKETS];
  const grouped = useMemo(() => {
    const g: Record<string, Record<string, JobWo[]>> = {};
    for (const s of WO_STATUSES) {
      g[s] = {};
      for (const b of DUE_BUCKETS) g[s][b] = [];
    }
    for (const w of rows) g[w.status][dueBucket(w)].push(w);
    return g;
  }, [rows]);

  // Only show statuses that have at least one job in the current filter.
  const activeStatuses = WO_STATUSES.filter((s) =>
    DUE_BUCKETS.some((b) => grouped[s][b].length > 0)
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-ink-100/50">
            <tr>
              <th className="th">Order status</th>
              {cols.map((b) => (
                <th key={b} className={`th ${DUE_BUCKET_TONE[b].text}`}>
                  {DUE_BUCKET_LABELS[b]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeStatuses.length === 0 && (
              <tr>
                <td className="td py-10 text-center text-ink-400" colSpan={cols.length + 1}>
                  No jobs match your filters.
                </td>
              </tr>
            )}
            {activeStatuses.map((s) => (
              <tr key={s}>
                <td className="td">
                  <StatusBadge status={s} />
                </td>
                {cols.map((b) => {
                  const cell = grouped[s][b];
                  return (
                    <td key={b} className="td align-top">
                      {cell.length === 0 ? (
                        <span className="text-ink-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cell.map((w) => (
                            <Link
                              key={w._id}
                              href={`/work-orders/${w._id}`}
                              className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-medium text-ink-700 hover:bg-ink-200"
                              title={`${w.productName} · ${w.customerRef}`}
                            >
                              {w.woNo}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-ink-100 px-3 py-2.5 text-xs text-ink-500">
        <Legend color="#dc2626" label="Overdue" />
        <Legend color="#d97706" label="Due today" />
        <Legend color="#2563eb" label="Due tomorrow" />
        <Legend color="#64748b" label="Later" />
        <span className="ml-auto">
          Showing <b className="text-ink-700">{rows.length}</b> of{" "}
          <b className="text-ink-700">{total}</b> jobs
        </span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
