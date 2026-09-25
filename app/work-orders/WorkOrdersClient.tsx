"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getJSON, fmtDate, fmtNum } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import {
  StatusBadge,
  DeliveryBadge,
  PriorityBadge,
  EmptyState,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import {
  WO_STATUSES,
  WO_STATUS_LABELS,
  WO_STATUS_COLORS,
  PRIORITIES,
  STAGE_LABELS,
  deliveryFlag,
  type WoStatus,
} from "@/lib/domain";

export interface Wo {
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

const EMPTY = {
  status: "",
  priority: "",
  customer: "",
  product: "",
  dueFrom: "",
  dueTo: "",
  qtyMin: "",
  qtyMax: "",
};
type Filters = typeof EMPTY;

export default function WorkOrdersClient({ initial }: { initial: Wo[] | null }) {
  const { data, error, loading, reload } = useAsync<Wo[]>(
    () => getJSON("/api/work-orders"),
    [],
    { cacheKey: "/api/work-orders", initialData: initial ?? undefined }
  );
  const all = useMemo(() => data || [], [data]);

  const [view, setView] = useState<"list" | "kanban">("list");
  const [f, setF] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const setFilter = (k: keyof Filters, v: string) =>
    setF((s) => ({ ...s, [k]: v }));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of WO_STATUSES) c[s] = 0;
    for (const w of all) c[w.status] = (c[w.status] || 0) + 1;
    return c;
  }, [all]);

  const filtered = useMemo(() => all.filter((w) => matches(w, f)), [all, f]);
  const activeCount = Object.entries(f).filter(([, v]) => v !== "").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
            Work Orders
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {filtered.length} of {all.length} work orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            {(["list", "kanban"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  view === v
                    ? "bg-ink-100 text-ink-900"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                <Icon name={v === "list" ? "workorders" : "board"} size={15} />
                {v}
              </button>
            ))}
          </div>
          <Link href="/work-orders/new" className="btn-primary">
            <Icon name="plus" size={16} />
            <span className="hidden sm:inline">New Work Order</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Status summary strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {WO_STATUSES.map((s) => {
          const active = f.status === s;
          return (
            <button
              key={s}
              onClick={() => setFilter("status", active ? "" : s)}
              className={`flex min-w-[128px] shrink-0 items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-ink-900 ring-1 ring-ink-900"
                  : "border-ink-200 hover:border-ink-300"
              }`}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: `${WO_STATUS_COLORS[s]}1a` }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: WO_STATUS_COLORS[s] }}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold leading-none tabular-nums text-ink-900">
                  {counts[s] || 0}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-500">
                  {WO_STATUS_LABELS[s]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        {/* Filters (mobile: collapsible; desktop: right rail) */}
        <aside className="lg:order-2">
          <div className="mb-2 lg:hidden">
            <button
              className="btn-ghost w-full justify-between"
              onClick={() => setShowFilters((v) => !v)}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="masters" size={16} />
                Filters
                {activeCount > 0 && (
                  <span className="badge bg-ink-900 text-white">{activeCount}</span>
                )}
              </span>
              <Icon
                name="chevronRight"
                size={16}
                className={`transition-transform ${showFilters ? "rotate-90" : ""}`}
              />
            </button>
          </div>
          <div className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <FiltersPanel
              f={f}
              setFilter={setFilter}
              onClear={() => setF(EMPTY)}
              onApply={() => setShowFilters(false)}
            />
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 lg:order-1">
          <DataGate loading={loading} error={error} onReload={reload}>
            {view === "list" ? (
              <ListView
                rows={filtered}
                expanded={expanded}
                onToggle={toggle}
              />
            ) : (
              <KanbanView rows={filtered} />
            )}
          </DataGate>
        </div>
      </div>
    </div>
  );
}

function matches(w: Wo, f: Filters): boolean {
  if (f.status && w.status !== f.status) return false;
  if (f.priority && w.priority !== f.priority) return false;
  if (f.customer && !w.customerRef?.toLowerCase().includes(f.customer.toLowerCase()))
    return false;
  if (
    f.product &&
    !`${w.productName} ${w.sku}`.toLowerCase().includes(f.product.toLowerCase())
  )
    return false;
  if (f.dueFrom && (!w.dueDate || new Date(w.dueDate) < new Date(f.dueFrom)))
    return false;
  if (f.dueTo && (!w.dueDate || new Date(w.dueDate) > new Date(f.dueTo + "T23:59:59")))
    return false;
  if (f.qtyMin && w.targetQty < Number(f.qtyMin)) return false;
  if (f.qtyMax && w.targetQty > Number(f.qtyMax)) return false;
  return true;
}

function FiltersPanel({
  f,
  setFilter,
  onClear,
  onApply,
}: {
  f: Filters;
  setFilter: (k: keyof Filters, v: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-semibold">
          <Icon name="masters" size={16} className="text-ink-500" />
          Filters
        </span>
        <button
          className="text-sm font-medium text-brand-700 hover:text-brand-800"
          onClick={onClear}
        >
          Clear all
        </button>
      </div>

      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={f.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {WO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WO_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Priority</label>
        <select
          className="input"
          value={f.priority}
          onChange={(e) => setFilter("priority", e.target.value)}
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Due date range</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input"
            value={f.dueFrom}
            onChange={(e) => setFilter("dueFrom", e.target.value)}
          />
          <Icon name="arrowRight" size={16} className="shrink-0 text-ink-400" />
          <input
            type="date"
            className="input"
            value={f.dueTo}
            onChange={(e) => setFilter("dueTo", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Customer</label>
        <input
          className="input"
          placeholder="Search customer…"
          value={f.customer}
          onChange={(e) => setFilter("customer", e.target.value)}
        />
      </div>

      <div>
        <label className="label">Product</label>
        <input
          className="input"
          placeholder="Search product…"
          value={f.product}
          onChange={(e) => setFilter("product", e.target.value)}
        />
      </div>

      <div>
        <label className="label">Target quantity</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input"
            placeholder="Min"
            value={f.qtyMin}
            onChange={(e) => setFilter("qtyMin", e.target.value)}
          />
          <input
            type="number"
            className="input"
            placeholder="Max"
            value={f.qtyMax}
            onChange={(e) => setFilter("qtyMax", e.target.value)}
          />
        </div>
      </div>

      <button className="btn-primary w-full" onClick={onApply}>
        Apply
      </button>
    </div>
  );
}

function KanbanView({ rows }: { rows: Wo[] }) {
  const grouped = (s: WoStatus) => rows.filter((w) => w.status === s);
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {WO_STATUSES.map((s) => {
        const cards = grouped(s);
        return (
          <div
            key={s}
            className="flex min-w-[240px] flex-1 flex-col overflow-hidden rounded-xl border border-ink-200 bg-ink-50/50"
          >
            <div className="h-1 w-full" style={{ backgroundColor: WO_STATUS_COLORS[s] }} />
            <div className="flex items-center justify-between border-b border-ink-200 px-3 py-2.5">
              <span className="text-sm font-semibold text-ink-900">
                {WO_STATUS_LABELS[s]}
              </span>
              <span className="badge bg-white text-ink-500 ring-1 ring-inset ring-ink-200">
                {cards.length}
              </span>
            </div>
            <div className="min-h-[160px] flex-1 space-y-2 p-2">
              {cards.map((w) => (
                <Link
                  key={w._id}
                  href={`/work-orders/${w._id}`}
                  className="card block p-3 hover:shadow-pop"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-brand-700">
                      {w.woNo}
                    </span>
                    <PriorityBadge priority={w.priority} />
                  </div>
                  <div className="mt-1 text-sm text-ink-900">{w.productName}</div>
                  <div className="text-xs text-ink-500">
                    {w.customerRef} · {fmtNum(w.targetQty)} {w.unit}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <DeliveryBadge dueDate={w.dueDate} />
                    <span className="text-[11px] text-ink-500">
                      {fmtDate(w.dueDate)}
                    </span>
                  </div>
                </Link>
              ))}
              {cards.length === 0 && (
                <div className="py-6 text-center text-xs text-ink-400">No jobs</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  rows,
  expanded,
  onToggle,
}: {
  rows: Wo[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((w) => (
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
            {(w.priority !== "Normal" || deliveryFlag(w.dueDate) !== "None") && (
              <div className="mt-2 flex flex-wrap gap-1">
                <PriorityBadge priority={w.priority} />
                <DeliveryBadge dueDate={w.dueDate} />
              </div>
            )}
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="card p-8 text-center text-sm text-ink-500">
            No work orders match.
          </div>
        )}
      </div>

      {/* Desktop: expandable table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full">
          <thead className="bg-ink-100/50">
            <tr>
              <th className="th w-10"></th>
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
            {rows.map((w) => (
              <FragmentRow
                key={w._id}
                w={w}
                isOpen={expanded.has(w._id)}
                onToggle={() => onToggle(w._id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="td text-center text-ink-500 py-8" colSpan={8}>
                  No work orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** One collapsed work-order row plus its expandable detail panel. */
function FragmentRow({
  w,
  isOpen,
  onToggle,
}: {
  w: Wo;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer hover:bg-ink-100/40 ${
          isOpen ? "bg-ink-100/40" : ""
        }`}
        onClick={onToggle}
      >
        <td className="td text-center">
          <button
            type="button"
            className="btn-ghost btn-sm !p-1"
            aria-label={isOpen ? "Collapse" : "Expand"}
            aria-expanded={isOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Icon
              name="chevronRight"
              size={16}
              className={`text-ink-500 transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
          </button>
        </td>
        <td className="td">
          <Link
            href={`/work-orders/${w._id}`}
            className="font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
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
      {isOpen && (
        <tr className="bg-ink-50/60">
          <td></td>
          <td className="px-3 pb-4 pt-0" colSpan={7}>
            <WoDetailPreview id={w._id} />
          </td>
        </tr>
      )}
    </>
  );
}

/** Lazy-loaded inline preview of a work order's specs, routing and stage lines. */
function WoDetailPreview({ id }: { id: string }) {
  const url = `/api/work-orders/${id}`;
  const { data, error, loading, reload } = useAsync<any>(() => getJSON(url), [id], {
    cacheKey: url,
  });

  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <DataGate loading={loading} error={error} onReload={reload}>
        {data?.workOrder && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                  Specs snapshot
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <Spec k="GSM" v={data.workOrder.specs?.gsm} />
                  <Spec
                    k="Width"
                    v={
                      data.workOrder.specs?.widthInch &&
                      `${data.workOrder.specs.widthInch}"`
                    }
                  />
                  <Spec k="Composition" v={data.workOrder.specs?.composition} />
                  <Spec k="Colour" v={data.workOrder.specs?.color} />
                  <Spec k="Finish" v={data.workOrder.specs?.finish} />
                  <Spec k="BOM ver" v={data.workOrder.bomVersion} />
                </dl>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                  Process routing
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {(data.workOrder.routing || []).map((r: any, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      <span
                        className={`badge ${
                          r.mode === "JobWork"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS]}
                      </span>
                      {i < data.workOrder.routing.length - 1 && (
                        <Icon name="chevronRight" size={13} className="text-ink-300" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase text-ink-500">
                Stage entries — qty in / out & loss
              </div>
              {!data.stageEntries || data.stageEntries.length === 0 ? (
                <EmptyState text="No stage entries yet." />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Stage</th>
                      <th className="th text-right">In</th>
                      <th className="th text-right">Out</th>
                      <th className="th text-right">Loss</th>
                      <th className="th">Machine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stageEntries.map((s: any) => (
                      <tr key={s._id}>
                        <td className="td">
                          {STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS]}
                        </td>
                        <td className="td text-right">
                          {fmtNum(s.qtyIn, 0)} {s.inUnit}
                        </td>
                        <td className="td text-right">
                          {fmtNum(s.qtyOut, 0)} {s.outUnit}
                        </td>
                        <td
                          className={`td text-right ${
                            s.lossFlagged ? "font-semibold text-red-600" : ""
                          }`}
                        >
                          {s.lossPct?.toFixed(1)}%
                        </td>
                        <td className="td text-xs">{s.machineName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-1">
              <Link href={`/work-orders/${id}`} className="btn-ghost btn-sm">
                Open full work order
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </div>
        )}
      </DataGate>
    </div>
  );
}

function Spec({ k, v }: { k: string; v?: any }) {
  return (
    <>
      <dt className="text-ink-500">{k}</dt>
      <dd className="text-ink-900">{v ?? "—"}</dd>
    </>
  );
}
