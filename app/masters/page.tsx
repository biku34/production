"use client";

import { useState } from "react";
import { getJSON, fmtNum, fmtDate, postJSON } from "@/lib/client";
import { useAsync } from "@/components/useAsync";
import { DataGate } from "@/components/DataGate";
import { Icon } from "@/components/Icon";
import { ROLE_LABELS, STAGE_LABELS, type Role } from "@/lib/domain";

const TABS = [
  "Products",
  "Materials",
  "Vendors",
  "Users",
  "Sales Orders",
] as const;
type Tab = (typeof TABS)[number];

export default function MastersPage() {
  const [tab, setTab] = useState<Tab>("Products");
  const [seeding, setSeeding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Masters</h1>
          <p className="text-sm text-ink-500">
            Configurable masters — products (BOM + routing), materials, vendors,
            users, sales orders.
          </p>
        </div>
        <button
          className="btn-ghost"
          disabled={seeding}
          onClick={async () => {
            if (!confirm("Wipe and reseed demo data?")) return;
            setSeeding(true);
            try {
              await postJSON("/api/seed", {});
              location.reload();
            } catch (e: any) {
              alert(e?.message);
            } finally {
              setSeeding(false);
            }
          }}
        >
          <Icon name="refresh" size={15} />
          {seeding ? "Seeding…" : "Reseed demo data"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Products" && <Products />}
      {tab === "Materials" && <Materials />}
      {tab === "Vendors" && <Vendors />}
      {tab === "Users" && <Users />}
      {tab === "Sales Orders" && <SalesOrders />}
    </div>
  );
}

function Products() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/products"),
    []
  );
  return (
    <DataGate loading={loading} error={error} onReload={reload}>
      <div className="space-y-4">
        {(data || []).map((p) => {
          const bom = [...(p.boms || [])].sort(
            (a, b) => b.version - a.version
          )[0];
          return (
            <div key={p._id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-ink-500">{p.sku}</div>
                </div>
                <div className="text-xs text-ink-500">
                  {p.gsm} GSM · {p.widthInch}" · {p.composition}
                </div>
              </div>
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-ink-500 mb-1">
                    BOM v{bom?.version} (per {bom?.lines?.[0]?.per || 1} units)
                  </div>
                  <ul className="text-sm space-y-0.5">
                    {(bom?.lines || []).map((l: any, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>{l.material?.name || "Material"}</span>
                        <span className="text-ink-500">
                          {l.qtyPerUnit} {l.unit} / {l.per}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-ink-500 mb-1">
                    Routing
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {[...(p.routing || [])]
                      .sort((a, b) => a.seq - b.seq)
                      .map((r: any, i: number) => (
                        <span
                          key={i}
                          className={`badge ${
                            r.mode === "JobWork"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-ink-100 text-ink-700"
                          }`}
                          title={`${r.inUnit}→${r.outUnit}, std ${r.stdLossPct}%`}
                        >
                          {STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS]}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {(data || []).length === 0 && (
          <p className="text-sm text-ink-500">No products.</p>
        )}
      </div>
    </DataGate>
  );
}

function Materials() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/materials"),
    []
  );
  return (
    <DataGate loading={loading} error={error} onReload={reload}>
      <SimpleTable
        rows={data || []}
        cols={[
          ["Code", (m) => m.code],
          ["Name", (m) => m.name],
          ["Category", (m) => m.category],
          ["Stock", (m) => `${fmtNum(m.stockQty, 0)} ${m.unit}`],
          ["Out at vendor", (m) => `${fmtNum(m.outAtVendorQty, 0)} ${m.unit}`],
          ["Unit cost", (m) => `₹${fmtNum(m.unitCost, 0)}`],
        ]}
      />
    </DataGate>
  );
}

function Vendors() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/vendors"),
    []
  );
  return (
    <DataGate loading={loading} error={error} onReload={reload}>
      <SimpleTable
        rows={data || []}
        cols={[
          ["Code", (v) => v.code],
          ["Name", (v) => v.name],
          ["Processes", (v) => (v.processes || []).join(", ")],
          ["Turnaround", (v) => `${v.avgTurnaroundDays} d`],
          ["Avg loss", (v) => `${v.avgLossPct}%`],
        ]}
      />
    </DataGate>
  );
}

function Users() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/users"),
    []
  );
  return (
    <DataGate loading={loading} error={error} onReload={reload}>
      <SimpleTable
        rows={data || []}
        cols={[
          ["Name", (u) => u.name],
          ["Role", (u) => ROLE_LABELS[u.role as Role] || u.role],
          [
            "Stages",
            (u) =>
              (u.stages || [])
                .map((s: string) => STAGE_LABELS[s as keyof typeof STAGE_LABELS])
                .join(", ") || "—",
          ],
          ["Email", (u) => u.email],
        ]}
      />
    </DataGate>
  );
}

function SalesOrders() {
  const { data, error, loading, reload } = useAsync<any[]>(
    () => getJSON("/api/sales-orders"),
    []
  );
  return (
    <DataGate loading={loading} error={error} onReload={reload}>
      <SimpleTable
        rows={data || []}
        cols={[
          ["Order", (o) => o.orderNo],
          ["Customer", (o) => o.customer],
          ["Product", (o) => o.product?.name || "—"],
          ["Qty", (o) => `${fmtNum(o.qty, 0)} ${o.unit}`],
          ["Due", (o) => fmtDate(o.dueDate)],
          ["Status", (o) => o.status],
          ["WIP (from prod)", (o) => o.wipStatus || "—"],
        ]}
      />
    </DataGate>
  );
}

function SimpleTable({
  rows,
  cols,
}: {
  rows: any[];
  cols: [string, (r: any) => React.ReactNode][];
}) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-ink-100/50">
          <tr>
            {cols.map(([h]) => (
              <th key={h} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i} className="hover:bg-ink-100/40">
              {cols.map(([h, fn]) => (
                <td key={h} className="td">
                  {fn(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="td text-center text-ink-500 py-8" colSpan={cols.length}>
                No records.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
